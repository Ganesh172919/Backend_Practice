# 31. Socket Event Reference

## Purpose

This is the concise AI-related socket event reference for the live source tree.

## Incoming Events

| Event | Payload |
| --- | --- |
| `authenticate` | callback only |
| `join_room` | `roomId` |
| `leave_room` | `roomId` |
| `send_message` | `{ roomId, content, fileUrl?, fileName?, fileType?, fileSize? }` |
| `reply_message` | `{ roomId, content, replyToId }` |
| `trigger_ai` | `{ roomId, prompt, modelId?, attachment? }` |
| `add_reaction` | `{ roomId, messageId, emoji }` |
| `mark_read` | `{ roomId, messageIds }` |

## Outgoing Events

| Event | Payload highlights |
| --- | --- |
| `ai_thinking` | `{ roomId, status: true|false }` |
| `ai_response` | formatted saved AI message |
| `receive_message` | formatted saved human message |
| `error_message` | `{ success:false, error, ...details }` |
| `typing_start` / `typing_stop` | typing indicators |
| `reaction_update` | `{ messageId, reactions }` |
| `message_read` | read receipt payload |

## AI-Specific Notes

- `trigger_ai` requires both DB membership and joined socket-room state
- successful AI results are persisted before `ai_response` is emitted
- failed AI runs still emit `ai_response` with a generic stored AI error message

## `dist/` Drift Notes

`dist/socket/index.js` uses different event names and payloads in places:

- `socket_error` vs `error_message`
- `message_created` vs `ai_response`
- `thinking` vs `status`

## Rebuild Notes

1. publish event schemas
2. keep error payloads consistent across socket and REST layers
3. document which events imply DB writes

