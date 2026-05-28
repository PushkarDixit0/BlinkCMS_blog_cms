import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Dialog, FileUpload } from "@skeletonlabs/skeleton-react";
import { EditorContent, useEditor } from "@tiptap/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { all, createLowlight } from "lowlight";
import {
  createPost,
  deletePost,
  getEditorPost,
  toApiUrl,
  updatePost,
  uploadEditorAsset,
} from "../api";
import { deleteStoredPost, getStoredPost } from "../blogStore";

const lowlight = createLowlight(all);
const blankContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function plainTextFromHtml(html) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent || element.innerText || "";
}

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value || "");
}

function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const initialPost = useMemo(
    () => (postId ? getStoredPost(postId) || location.state?.post || null : null),
    [location.state, postId],
  );
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [status, setStatus] = useState(initialPost?.status || "draft");
  const [tags, setTags] = useState(initialPost?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [comments, setComments] = useState(initialPost?.comments || []);
  const [commentDraft, setCommentDraft] = useState("");
  const [savedPostId, setSavedPostId] = useState(initialPost?._id || "");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeText, setCodeText] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        allowBase64: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
    ],
    content: initialPost?.contentJson || initialPost?.content || blankContent,
    editorProps: {
      attributes: {
        class: "editor-surface",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    let isCurrent = true;

    if (!postId || initialPost || !editor) {
      return () => {
        isCurrent = false;
      };
    }

    getEditorPost(postId)
      .then((data) => {
        const post = data?.post;
        if (!isCurrent || !post) return;

        setTitle(post.title || "");
        setSlug(post.slug || "");
        setExcerpt(post.excerpt || "");
        setStatus(post.status || "draft");
        setTags(post.tags || []);
        setComments(post.comments || []);
        setSavedPostId(post._id || "");
        editor.commands.setContent(post.contentJson || post.content || blankContent);
      })
      .catch((requestError) => {
        if (isCurrent) {
          setSaveError(requestError.message);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [editor, initialPost, postId]);

  function buildPost(nextStatus) {
    const html = editor?.getHTML() || "";
    return {
      _id: savedPostId || undefined,
      title: title.trim() || "Untitled post",
      slug: slugify(slug || title || "untitled-post"),
      excerpt: excerpt.trim() || plainTextFromHtml(html).slice(0, 160),
      content: html,
      contentJson: editor?.getJSON() || blankContent,
      status: nextStatus,
      author: "Admin",
      tags,
      comments,
    };
  }

  async function persist(nextStatus) {
    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const payload = buildPost(nextStatus);
      const shouldUpdateRemotePost = isMongoObjectId(savedPostId);
      const data = shouldUpdateRemotePost
        ? await updatePost(savedPostId, payload)
        : await createPost(payload);
      const savedPost = data?.post;

      if (!shouldUpdateRemotePost && savedPostId) {
        deleteStoredPost(savedPostId);
      }

      setSavedPostId(savedPost?._id || savedPostId);
      setStatus(savedPost?.status || nextStatus);
      setSaveMessage(
        (savedPost?.status || nextStatus) === "published"
          ? "Post published."
          : "Draft saved.",
      );
      window.setTimeout(() => setSaveMessage(""), 2200);
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  function addTag() {
    const nextTag = tagDraft.trim();
    if (!nextTag || tags.includes(nextTag)) return;
    setTags((currentTags) => [...currentTags, nextTag]);
    setTagDraft("");
  }

  function addComment() {
    const body = commentDraft.trim();
    if (!body) return;
    setComments((currentComments) => [
      ...currentComments,
      {
        id: crypto.randomUUID(),
        author: "Admin",
        body,
        createdAt: new Date().toISOString(),
        approved: true,
      },
    ]);
    setCommentDraft("");
  }

  function applyLink() {
    if (!editor) return;
    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkDialogOpen(false);
    setLinkUrl("");
  }

  function insertCodeBlock() {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "codeBlock",
        attrs: { language: codeLanguage || "plaintext" },
        content: [{ type: "text", text: codeText || "code here" }],
      })
      .run();
    setCodeDialogOpen(false);
    setCodeText("");
  }

  async function insertUploadedImages(files) {
    setSaveError("");
    setIsUploadingAsset(true);

    try {
      for (const file of Array.from(files || [])) {
        if (!file.type.startsWith("image/")) continue;

        const data = await uploadEditorAsset(file);
        const assetUrl = data?.asset?.url;

        if (!assetUrl) {
          throw new Error("Upload failed.");
        }

        editor
          ?.chain()
          .focus()
          .setImage({ src: toApiUrl(assetUrl), alt: file.name })
          .run();
      }
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setIsUploadingAsset(false);
    }
  }

  async function removePost() {
    if (!savedPostId) return;
    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      if (isMongoObjectId(savedPostId)) {
        await deletePost(savedPostId);
      } else {
        deleteStoredPost(savedPostId);
      }

      navigate("/admin");
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  const toolbarItems = [
    ["H1", () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), "heading", { level: 1 }],
    ["H2", () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), "heading", { level: 2 }],
    ["B", () => editor?.chain().focus().toggleBold().run(), "bold"],
    ["I", () => editor?.chain().focus().toggleItalic().run(), "italic"],
    ["U", () => editor?.chain().focus().toggleUnderline().run(), "underline"],
    ["List", () => editor?.chain().focus().toggleBulletList().run(), "bulletList"],
    ["1.", () => editor?.chain().focus().toggleOrderedList().run(), "orderedList"],
    ["Quote", () => editor?.chain().focus().toggleBlockquote().run(), "blockquote"],
  ];

  return (
    <main className="editor-page">
      <header className="editor-topbar">
        <div>
          <p className="eyebrow">{postId ? "Edit Post" : "New Post"}</p>
          <h1>Blog Editor</h1>
        </div>
        <div className="editor-actions">
          {saveMessage ? <span className="save-message">{saveMessage}</span> : null}
          {saveError ? <span className="form-error">{saveError}</span> : null}
          <button
            type="button"
            className="secondary-action"
            disabled={isSaving || isUploadingAsset}
            onClick={() => persist("draft")}
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={isSaving || isUploadingAsset}
            onClick={() => persist("published")}
          >
            Publish
          </button>
          <Link className="admin-link" to="/admin">
            Dashboard
          </Link>
        </div>
      </header>

      <section className="editor-layout">
        <div className="editor-main">
          <input
            className="title-input"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slug) {
                setSlug(slugify(event.target.value));
              }
            }}
            placeholder="Post title"
          />

          <div className="editor-toolbar" aria-label="Editor formatting">
            {toolbarItems.map(([label, action, activeName, activeAttrs]) => (
              <button
                type="button"
                key={label}
                className={editor?.isActive(activeName, activeAttrs) ? "is-active" : ""}
                onClick={action}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setLinkDialogOpen(true)}>
              Link
            </button>
            <button type="button" onClick={() => setCodeDialogOpen(true)}>
              Code
            </button>
            <FileUpload
              accept="image/*"
              multiple
            >
              <FileUpload.Trigger className="upload-trigger">Upload image</FileUpload.Trigger>
              <FileUpload.HiddenInput
                accept="image/*"
                multiple
                onChange={(event) => insertUploadedImages(event.currentTarget.files)}
              />
            </FileUpload>
          </div>

          <EditorContent editor={editor} />
        </div>

        <aside className="editor-sidebar">
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>

          <label>
            Slug
            <input value={slug} onChange={(event) => setSlug(event.target.value)} />
          </label>

          <label>
            Excerpt
            <textarea
              rows="4"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
            />
          </label>

          <div className="metadata-group">
            <span>Tags</span>
            <div className="tag-entry">
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag"
              />
              <button type="button" onClick={addTag}>
                Add
              </button>
            </div>
            <div className="tag-list">
              {tags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setTags((currentTags) => currentTags.filter((item) => item !== tag))}
                >
                  {tag} x
                </button>
              ))}
            </div>
          </div>

          <div className="metadata-group">
            <span>Comments</span>
            <textarea
              rows="3"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Add or moderate a note"
            />
            <button type="button" className="secondary-action" onClick={addComment}>
              Add comment
            </button>
            <div className="comment-list">
              {comments.map((comment) => (
                <article key={comment.id}>
                  <p>{comment.body}</p>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setComments((currentComments) =>
                          currentComments.map((item) =>
                            item.id === comment.id
                              ? { ...item, approved: !item.approved }
                              : item,
                          ),
                        )
                      }
                    >
                      {comment.approved ? "Approved" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setComments((currentComments) =>
                          currentComments.filter((item) => item.id !== comment.id),
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {savedPostId ? (
            <button
              type="button"
              className="danger-action"
              disabled={isSaving || isUploadingAsset}
              onClick={removePost}
            >
              Delete post
            </button>
          ) : null}
        </aside>
      </section>

      <Dialog open={linkDialogOpen} onOpenChange={(details) => setLinkDialogOpen(details.open)}>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Positioner className="dialog-positioner">
          <Dialog.Content className="dialog-content">
            <Dialog.Title className="dialog-title">Edit link</Dialog.Title>
            <Dialog.Description className="dialog-description">
              Add a URL to the current selection, or leave it blank to remove the link.
            </Dialog.Description>
            <input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
            />
            <div className="dialog-actions">
              <Dialog.CloseTrigger className="secondary-action">Cancel</Dialog.CloseTrigger>
              <button type="button" onClick={applyLink}>
                Apply
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog>

      <Dialog open={codeDialogOpen} onOpenChange={(details) => setCodeDialogOpen(details.open)}>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Positioner className="dialog-positioner">
          <Dialog.Content className="dialog-content">
            <Dialog.Title className="dialog-title">Insert fenced code</Dialog.Title>
            <Dialog.Description className="dialog-description">
              The language value is stored on the code block for syntax-style fenced snippets.
            </Dialog.Description>
            <select value={codeLanguage} onChange={(event) => setCodeLanguage(event.target.value)}>
              <option value="javascript">javascript</option>
              <option value="jsx">jsx</option>
              <option value="css">css</option>
              <option value="html">html</option>
              <option value="python">python</option>
              <option value="plaintext">plaintext</option>
            </select>
            <textarea
              rows="8"
              value={codeText}
              onChange={(event) => setCodeText(event.target.value)}
              placeholder="code here"
            />
            <div className="dialog-actions">
              <Dialog.CloseTrigger className="secondary-action">Cancel</Dialog.CloseTrigger>
              <button type="button" onClick={insertCodeBlock}>
                Insert
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog>
    </main>
  );
}

export default Editor;
