import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Dialog } from "@skeletonlabs/skeleton-react";
import { Mark, mergeAttributes } from "@tiptap/core";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { all, createLowlight } from "lowlight";
import { toApiUrl } from "../api/client.js";
import { deleteStoredPost, getStoredPost } from "../blogStore";
import {
  useCreatePost,
  useDeletePost,
  useEditorPost,
  useUpdatePost,
} from "../hooks/usePosts";
import { useUploadImage } from "../hooks/useUploads";
import { postFormSchema } from "../schemas/post.schema";

const lowlight = createLowlight(all);
const blankContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const fontSizeOptions = Array.from({ length: 10 }, (_, index) =>
  String((index + 1) * 10),
);

function getImageDimension(value) {
  if (!value) return null;
  const match = String(value).match(/\d+/);
  return match ? match[0] : null;
}

function ResizableImageView({ node, selected, updateAttributes }) {
  const imageRef = useRef(null);

  function startResize(event) {
    event.preventDefault();
    event.stopPropagation();

    const image = imageRef.current;
    if (!image) return;

    const startX = event.clientX;
    const startWidth = image.offsetWidth;
    const startHeight = image.offsetHeight;
    const aspectRatio = startHeight ? startWidth / startHeight : 1;

    function resize(pointerEvent) {
      const nextWidth = Math.max(
        80,
        Math.round(startWidth + pointerEvent.clientX - startX),
      );
      const nextHeight = Math.round(nextWidth / aspectRatio);

      updateAttributes({
        width: String(nextWidth),
        height: String(nextHeight),
      });
    }

    function stopResize() {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, { once: true });
  }

  return (
    <NodeViewWrapper
      className={`resizable-image${selected ? " is-selected" : ""}`}
      style={{ width: node.attrs.width ? `${node.attrs.width}px` : undefined }}
    >
      <img
        ref={imageRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || undefined}
        width={node.attrs.width || undefined}
        height={node.attrs.height || undefined}
        style={{ width: node.attrs.width ? "100%" : undefined }}
        draggable="false"
      />
      <button
        type="button"
        className="image-resize-handle"
        aria-label="Resize image"
        onPointerDown={startResize}
      />
    </NodeViewWrapper>
  );
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          getImageDimension(element.getAttribute("width")) ||
          getImageDimension(element.style.width),
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: (element) =>
          getImageDimension(element.getAttribute("height")) ||
          getImageDimension(element.style.height),
        renderHTML: (attributes) =>
          attributes.height ? { height: attributes.height } : {},
      },
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const attributes = { ...HTMLAttributes };
    delete attributes.style;

    return ["img", mergeAttributes(attributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

const FontSize = Mark.create({
  name: "fontSize",

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) =>
          element.style.fontSize?.replace("%", "") || null,
        renderHTML: (attributes) =>
          attributes.size ? { style: `font-size: ${attributes.size}%` } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style*=font-size]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark(this.name, { size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    };
  },
});

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value || "");
}

function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const initialPost = useMemo(
    () =>
      postId ? getStoredPost(postId) || location.state?.post || null : null,
    [location.state, postId],
  );
  const {
    formState: { errors },
    register,
    control,
    setValue,
    trigger,
  } = useForm({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: initialPost?.title || "",
      status: initialPost?.status || "draft",
      tags: initialPost?.tags || [],
    },
  });
  const title = useWatch({ control, name: "title" }) || "";
  const [tags, setTags] = useState(initialPost?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [savedPostId, setSavedPostId] = useState(initialPost?._id || "");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeText, setCodeText] = useState("");
  const uploadInputRef = useRef(null);
  const activeUploadKeysRef = useRef(new Set());
  const recentUploadKeysRef = useRef(new Set());
  const editorPostQuery = useEditorPost(
    postId,
    Boolean(postId && !initialPost),
  );
  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost(savedPostId);
  const deletePostMutation = useDeletePost();
  const uploadImageMutation = useUploadImage();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
      }),
      FontSize,
      ResizableImage.configure({
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
    const post = editorPostQuery.data?.post;

    if (!post || !editor) return;

    setValue("title", post.title || "");
    setValue("status", post.status || "draft");
    setValue("tags", post.tags || []);
    // The editor needs to hydrate local metadata once the remote post arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTags(post.tags || []);
    setSavedPostId(post._id || "");
    editor.commands.setContent(post.contentJson || post.content || blankContent);
  }, [editor, editorPostQuery.data, setValue]);

  useEffect(() => {
    setValue("tags", tags);
  }, [setValue, tags]);

  function buildPost(nextStatus) {
    const html = editor?.getHTML() || "";
    return {
      _id: savedPostId || undefined,
      title: title.trim(),
      content: html,
      contentJson: editor?.getJSON() || blankContent,
      status: nextStatus,
      author: "Admin",
      tags,
    };
  }

  async function persist(nextStatus) {
    setValue("status", nextStatus);
    const isValid = await trigger();

    if (!isValid) {
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const payload = buildPost(nextStatus);
      const shouldUpdateRemotePost = isMongoObjectId(savedPostId);
      const data = shouldUpdateRemotePost
        ? await updatePostMutation.mutateAsync(payload)
        : await createPostMutation.mutateAsync(payload);
      const savedPost = data?.post;

      if (!shouldUpdateRemotePost && savedPostId) {
        deleteStoredPost(savedPostId);
      }

      setSavedPostId(savedPost?._id || savedPostId);
      setValue("status", savedPost?.status || nextStatus);
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

  function applyFontSize(size) {
    setFontSize(size);
    if (!editor) return;

    if (size) {
      editor.chain().focus().setFontSize(size).run();
    } else {
      editor.chain().focus().unsetFontSize().run();
    }
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
    if (!editor) return;

    setSaveError("");
    setIsUploadingAsset(true);

    try {
      for (const file of Array.from(files || [])) {
        if (!file.type.startsWith("image/")) continue;

        const uploadKey = `${file.name}:${file.size}:${file.lastModified}`;
        if (
          activeUploadKeysRef.current.has(uploadKey) ||
          recentUploadKeysRef.current.has(uploadKey)
        ) {
          continue;
        }

        activeUploadKeysRef.current.add(uploadKey);

        const data = await uploadImageMutation.mutateAsync(file);
        const assetUrl = data?.asset?.url;

        if (!assetUrl) {
          throw new Error("Upload failed.");
        }

        editor
          .chain()
          .focus()
          .setImage({ src: toApiUrl(assetUrl), alt: file.name })
          .run();

        activeUploadKeysRef.current.delete(uploadKey);
        recentUploadKeysRef.current.add(uploadKey);
        window.setTimeout(() => {
          recentUploadKeysRef.current.delete(uploadKey);
        }, 1500);
      }
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setIsUploadingAsset(false);
      activeUploadKeysRef.current.clear();
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  }

  async function removePost() {
    if (!savedPostId) return;
    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      if (isMongoObjectId(savedPostId)) {
        await deletePostMutation.mutateAsync(savedPostId);
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
    ["B", () => editor?.chain().focus().toggleBold().run(), "bold"],
    ["I", () => editor?.chain().focus().toggleItalic().run(), "italic"],
    ["U", () => editor?.chain().focus().toggleUnderline().run(), "underline"],
    [
      "Quote",
      () => editor?.chain().focus().toggleBlockquote().run(),
      "blockquote",
    ],
  ];

  return (
    <main className="editor-page">
      <header className="editor-topbar">
        <div>
          <p className="eyebrow">{postId ? "Edit Post" : "New Post"}</p>
          <h1>Blog Editor</h1>
        </div>
        <div className="editor-actions">
          {saveMessage ? (
            <span className="save-message">{saveMessage}</span>
          ) : null}
          {saveError ? <span className="form-error">{saveError}</span> : null}
          {editorPostQuery.error ? (
            <span className="form-error">{editorPostQuery.error.message}</span>
          ) : null}
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
            placeholder="Post title"
            {...register("title")}
          />
          {errors.title ? (
            <span className="field-error">{errors.title.message}</span>
          ) : null}

          <div className="editor-toolbar" aria-label="Editor formatting">
            <select
              aria-label="Font size"
              value={fontSize}
              onChange={(event) => applyFontSize(event.target.value)}
            >
              <option value="">Text size</option>
              {fontSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}%
                </option>
              ))}
            </select>
            {toolbarItems.map(([label, action, activeName, activeAttrs]) => (
              <button
                type="button"
                key={label}
                className={
                  editor?.isActive(activeName, activeAttrs) ? "is-active" : ""
                }
                onClick={action}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setCodeDialogOpen(true)}>
              Code
            </button>
            <button
              type="button"
              className="upload-trigger"
              disabled={isUploadingAsset}
              onClick={() => uploadInputRef.current?.click()}
            >
              {isUploadingAsset ? "Uploading..." : "Upload image"}
            </button>
            <input
              ref={uploadInputRef}
              className="file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                insertUploadedImages(event.currentTarget.files)
              }
            />
          </div>

          <EditorContent editor={editor} />
        </div>

        <aside className="editor-sidebar">
          <label>
            Status
            <select {...register("status")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            {errors.status ? (
              <span className="field-error">{errors.status.message}</span>
            ) : null}
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
                  onClick={() =>
                    setTags((currentTags) =>
                      currentTags.filter((item) => item !== tag),
                    )
                  }
                >
                  {tag} x
                </button>
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

      <Dialog
        open={codeDialogOpen}
        onOpenChange={(details) => setCodeDialogOpen(details.open)}
      >
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Positioner className="dialog-positioner">
          <Dialog.Content className="dialog-content">
            <Dialog.Title className="dialog-title">
              Insert fenced code
            </Dialog.Title>
            <Dialog.Description className="dialog-description">
              The language value is stored on the code block for syntax-style
              fenced snippets.
            </Dialog.Description>
            <select
              value={codeLanguage}
              onChange={(event) => setCodeLanguage(event.target.value)}
            >
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
              <Dialog.CloseTrigger className="secondary-action">
                Cancel
              </Dialog.CloseTrigger>
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
