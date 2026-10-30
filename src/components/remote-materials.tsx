"use client";
/* eslint-disable @next/next/no-img-element -- Same-origin private materials deliberately bypass the image optimizer and its cache. */
import { useRef, useState } from "react";
import type { Prompt } from "@/lib/content";
export default function RemoteMaterials({ prompt }: { prompt: Prompt }) {
  const dialog = useRef<HTMLDialogElement>(null),
    [enlarged, setEnlarged] = useState(""),
    [failed, setFailed] = useState<number[]>([]);
  if (!prompt.amplify || prompt.unavailable) return null;
  return (
    <section
      className="remote-materials"
      aria-label="AMPLIFY supporting materials"
    >
      {prompt.materials?.map((m) => {
        const url = `/api/amplify/questions/${prompt.amplify!.id}/materials/${m.index}`;
        return (
          <figure key={m.index}>
            {m.kind === "pdf" ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary compact"
              >
                Open supporting PDF {m.index + 1}
              </a>
            ) : (
              <>
                {failed.includes(m.index) ? (
                  <p role="status">
                    Supporting image {m.index + 1} is unavailable. The question
                    may have been hidden, or AMPLIFY may be offline.{" "}
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Try opening the material
                    </a>
                    .{" "}
                    <button
                      className="text-button"
                      onClick={() =>
                        setFailed((old) =>
                          old.filter((index) => index !== m.index),
                        )
                      }
                    >
                      Retry image
                    </button>
                  </p>
                ) : (
                  <button
                    className="material-image-button"
                    aria-label={`Enlarge supporting image ${m.index + 1}`}
                    onClick={() => {
                      setEnlarged(url);
                      dialog.current?.showModal();
                    }}
                  >
                    {/* External bank images are deliberately unoptimized, uncached same-origin responses. */}

                    <img
                      src={url}
                      alt={`Supporting visual ${m.index + 1} for ${prompt.title}`}
                      onError={() => setFailed((old) => [...old, m.index])}
                    />
                  </button>
                )}
                <figcaption>
                  Supporting image {m.index + 1} · tap to enlarge{" "}
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    Open separately
                  </a>
                </figcaption>
              </>
            )}
          </figure>
        );
      })}
      {prompt.supportingUrl && (
        <p className="external-material">
          <a
            href={prompt.supportingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open AMPLIFY supporting document ↗
          </a>
          <span>
            External material may require its owner’s sharing permission.
          </span>
        </p>
      )}
      {!prompt.materials?.length && !prompt.supportingUrl && (
        <p className="source-note">
          AMPLIFY has not supplied supporting materials for this question.
        </p>
      )}
      <dialog
        ref={dialog}
        className="visual-dialog material-dialog"
        aria-label="Enlarged supporting material"
      >
        <header>
          <strong>AMPLIFY supporting material</strong>
          <button
            className="secondary compact"
            onClick={() => dialog.current?.close()}
          >
            Close visual
          </button>
        </header>
        <div className="material-enlarged">
          {enlarged && (
            <img src={enlarged} alt="Enlarged question supporting visual" />
          )}
        </div>
        <p className="visual-hint">
          Scroll or pinch to zoom. Your timer keeps running.
        </p>
      </dialog>
    </section>
  );
}
