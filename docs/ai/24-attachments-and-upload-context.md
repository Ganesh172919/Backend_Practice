# 24. Attachments And Upload Context

## Purpose

This document explains the upload pipeline and how different attachment types influence AI prompts.

## Relevant Files

- `routes/uploads.js`
- `middleware/upload.js`
- `services/messageFormatting.js`
- `services/gemini.js`
- `routes/chat.js`
- `index.js`

## Upload Pipeline

`POST /api/uploads`:

1. authenticates the user
2. runs Multer with disk storage
3. validates MIME type against `ALLOWED_TYPES`
4. stores file under `uploads/` with random hex name plus extension
5. returns file metadata for later AI requests

## Allowed Types

- JPEG, PNG, GIF, WebP
- PDF
- plain text, markdown, CSV, JSON, XML
- JavaScript and TypeScript text files

Max size is `5 MB`.

## Attachment Validation In AI Flows

Both solo chat and room AI validate attachment payloads with `validateAttachmentPayload()`:

- all four fields must exist if any exist
- `fileUrl` must start with `/api/uploads/`
- `fileType` must be allowed
- `fileSize` must be > 0 and <= 5 MB

## Prompt-Time Behavior By File Type

| Type | Behavior |
| --- | --- |
| text-like files | reads file from disk and injects up to 12000 chars |
| images <= 3 MB | base64-encodes image and adds multimodal prompt note |
| PDF | adds metadata note only; no text extraction |
| other allowed files | mostly metadata prompt text |

## Asymmetry

Attachment handling is intentionally asymmetric:

- text files get real content extraction
- images get multimodal payloads only for supporting providers
- PDFs do not get extracted text even though they are allowed uploads

This asymmetry matters because “supports files” in the UI does not mean all file types are equally understood.

## Risks

- uploaded files are retrievable through predictable API shape once the filename is known
- prompt size can balloon with large text files
- PDFs look supported to users but are weakly handled in practice

## Rebuild Notes

1. separate “upload allowed” from “AI deeply understands this file”
2. add server-side PDF text extraction if PDFs are a core workflow
3. consider signed URLs or auth-protected download endpoints

