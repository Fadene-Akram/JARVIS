# import json
# import logging
# import threading
# from datetime import datetime
# from zoneinfo import ZoneInfo

# from django.conf import settings
# from litellm import completion

# log = logging.getLogger(__name__)

# MAX_STEPS = 5
# MAX_HISTORY = 24


# class Agent:
#     def __init__(self, name, model, tools, system_prompt, messages=None):
#         self.name, self.model = name, model
#         self.tools = {t.__name__: t for t in tools}
#         self.schemas = [
#             {"type": "function", "function": t.llm_schema()}
#             for t in self.tools.values()
#         ] or None
#         self.system_prompt = system_prompt  # must contain {now}
#         self.messages = messages or []
#         self._lock = threading.Lock()  # one conversation, one request at a time

#     # ------------------------------------------------------------------ public
#     def invoke(self, text: str) -> str:
#         with self._lock:
#             self.messages.append({"role": "user", "content": text})
#             try:
#                 for _ in range(MAX_STEPS):
#                     msg = self._call_llm()

#                     entry = {"role": "assistant", "content": msg.content or ""}
#                     if msg.tool_calls:
#                         entry["tool_calls"] = [
#                             {
#                                 "id": c.id,
#                                 "type": "function",
#                                 "function": {
#                                     "name": c.function.name,
#                                     "arguments": c.function.arguments,
#                                 },
#                             }
#                             for c in msg.tool_calls
#                         ]
#                     self.messages.append(entry)

#                     if not msg.tool_calls:
#                         return msg.content or ""

#                     for call in msg.tool_calls:
#                         self.messages.append(self._run_tool(call))

#                 return "I'm afraid that took too many steps, sir."
#             finally:
#                 self._trim_history()

#     # ----------------------------------------------------------------- private
#     def _now(self) -> str:
#         return datetime.now(ZoneInfo(settings.TIME_ZONE)).isoformat()

#     def _call_llm(self):
#         system = {
#             "role": "system",
#             "content": self.system_prompt.format(now=self._now()),
#         }
#         resp = completion(
#             model=self.model,
#             messages=[system, *self._trimmed()],
#             tools=self.schemas,
#             temperature=0.1,
#             timeout=30,
#             num_retries=2,
#         )
#         return resp.choices[0].message

#     @staticmethod
#     def _drop_leading_orphans(msgs):
#         # never start with an assistant/tool message whose partner was cut off
#         while msgs and msgs[0]["role"] != "user":
#             msgs = msgs[1:]
#         return msgs

#     def _trimmed(self):
#         return self._drop_leading_orphans(self.messages[-MAX_HISTORY:])

#     def _trim_history(self):
#         """Keep stored history bounded, not just what is sent to the model."""
#         self.messages = self._trimmed()

#     def _run_tool(self, call):
#         name = call.function.name
#         tool_cls = self.tools.get(name)

#         if tool_cls is None:
#             output = f"Error: unknown tool {name}. Available: {list(self.tools)}"
#         else:
#             try:
#                 args = json.loads(call.function.arguments or "{}")
#                 output = tool_cls(**args).run()  # pydantic validates args
#             except Exception as e:
#                 log.exception("Tool %s failed", name)
#                 output = f"Error: {e}"

#         # ALWAYS answer the tool_call_id
#         return {
#             "role": "tool",
#             "tool_call_id": call.id,
#             "name": name,
#             "content": str(output),
#         }
import json
import logging
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from django.conf import settings
from litellm import completion

log = logging.getLogger(__name__)

MAX_STEPS = 5
MAX_HISTORY = 24
HIDDEN_ARGS = {"body", "description"}  # long/private fields are not sent to the UI


def _emit(on_event, **event):
    if on_event:
        try:
            on_event(event)
        except Exception:
            log.exception("on_event callback failed")


def _ui_args(args: dict) -> dict:
    return {
        k: (v[:120] if isinstance(v, str) else v)
        for k, v in args.items()
        if k not in HIDDEN_ARGS
    }


class Agent:
    def __init__(self, name, model, tools, system_prompt, messages=None):
        self.name, self.model = name, model
        self.tools = {t.__name__: t for t in tools}
        self.schemas = [
            {"type": "function", "function": t.llm_schema()}
            for t in self.tools.values()
        ] or None
        self.system_prompt = system_prompt  # must contain {now}
        self.messages = messages or []
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ public
    def invoke(self, text: str, on_event=None) -> str:
        """Run the agent. on_event(dict) receives tool_start / tool_end events."""
        with self._lock:
            self.messages.append({"role": "user", "content": text})
            try:
                for _ in range(MAX_STEPS):
                    msg = self._call_llm()

                    entry = {"role": "assistant", "content": msg.content or ""}
                    if msg.tool_calls:
                        entry["tool_calls"] = [
                            {
                                "id": c.id,
                                "type": "function",
                                "function": {
                                    "name": c.function.name,
                                    "arguments": c.function.arguments,
                                },
                            }
                            for c in msg.tool_calls
                        ]
                    self.messages.append(entry)

                    if not msg.tool_calls:
                        return msg.content or ""

                    for call in msg.tool_calls:
                        self.messages.append(self._run_tool(call, on_event))

                return "I'm afraid that took too many steps, sir."
            finally:
                self._trim_history()

    # ----------------------------------------------------------------- private
    def _now(self) -> str:
        return datetime.now(ZoneInfo(settings.TIME_ZONE)).isoformat()

    def _call_llm(self):
        system = {
            "role": "system",
            "content": self.system_prompt.format(now=self._now()),
        }
        resp = completion(
            model=self.model,
            messages=[system, *self._trimmed()],
            tools=self.schemas,
            temperature=0.1,
            timeout=30,
            num_retries=2,
        )
        return resp.choices[0].message

    @staticmethod
    def _drop_leading_orphans(msgs):
        while msgs and msgs[0]["role"] != "user":
            msgs = msgs[1:]
        return msgs

    def _trimmed(self):
        return self._drop_leading_orphans(self.messages[-MAX_HISTORY:])

    def _trim_history(self):
        self.messages = self._trimmed()

    def _run_tool(self, call, on_event=None):
        name = call.function.name
        tool_cls = self.tools.get(name)

        try:
            args = json.loads(call.function.arguments or "{}")
            if not isinstance(args, dict):
                args = {}
        except json.JSONDecodeError:
            args = {}

        _emit(on_event, type="tool_start", id=call.id, name=name, args=_ui_args(args))
        started = time.perf_counter()
        ok = True

        if tool_cls is None:
            ok = False
            output = f"Error: unknown tool {name}. Available: {list(self.tools)}"
        else:
            try:
                output = tool_cls(**args).run()  # pydantic validates args
            except Exception as e:
                ok = False
                log.exception("Tool %s failed", name)
                output = f"Error: {e}"

        _emit(
            on_event,
            type="tool_end",
            id=call.id,
            name=name,
            ok=ok,
            ms=int((time.perf_counter() - started) * 1000),
        )

        # ALWAYS answer the tool_call_id
        return {
            "role": "tool",
            "tool_call_id": call.id,
            "name": name,
            "content": str(output),
        }