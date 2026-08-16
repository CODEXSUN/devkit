import { useEffect, useState } from "react";
import type { RefObject } from "react";

type RailMessage = { id: string; role: "agent" | "user" };
type RailMarker = RailMessage & { active: boolean; index: number; position: number };

export function ConversationRail({
  messages,
  transcript
}: {
  messages: RailMessage[];
  transcript: RefObject<HTMLDivElement | null>;
}) {
  const [markers, setMarkers] = useState<RailMarker[]>([]);

  useEffect(() => {
    const element = transcript.current;
    if (!element || !messages.length) {
      setMarkers([]);
      return;
    }

    let frame = 0;
    const update = () => {
      const articles = messageArticles(element);
      const maxScroll = element.scrollHeight - element.clientHeight;
      setMarkers(
        messages.flatMap((message, index) => {
          const article = articles.get(message.id);
          if (!article) return [];
          return {
            ...message,
            active: isVisible(article, element),
            index,
            position: conversationMarkerPosition(article.offsetTop, maxScroll)
          };
        })
      );
    };
    const requestUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(requestUpdate);

    observer.observe(element);
    for (const article of messageArticles(element).values()) observer.observe(article);
    element.addEventListener("scroll", requestUpdate, { passive: true });
    requestUpdate();

    return () => {
      window.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", requestUpdate);
      observer.disconnect();
    };
  }, [messages, transcript]);

  if (!markers.length) return null;

  return (
    <nav aria-label="Conversation messages" className="conversation-rail">
      <span aria-hidden="true" className="conversation-rail-track" />
      {markers.map((marker) => (
        <button
          aria-label={`Go to ${marker.role} message ${marker.index + 1}`}
          className={`${marker.role}${marker.active ? " active" : ""}`}
          key={marker.id}
          onClick={() => jumpToMessage(transcript.current, marker.id)}
          style={{ top: `${marker.position}%` }}
          title={`Go to ${marker.role} message ${marker.index + 1}`}
          type="button"
        />
      ))}
    </nav>
  );
}

export function conversationMarkerPosition(offsetTop: number, maxScroll: number) {
  if (maxScroll <= 0) return 0;
  return Math.min(100, Math.max(0, (offsetTop / maxScroll) * 100));
}

function messageArticles(element: HTMLDivElement) {
  return new Map(
    Array.from(element.querySelectorAll<HTMLElement>("[data-message-id]")).map((article) => [
      article.dataset.messageId ?? "",
      article
    ])
  );
}

function isVisible(article: HTMLElement, transcript: HTMLDivElement) {
  const top = article.offsetTop;
  const bottom = top + article.offsetHeight;
  return bottom >= transcript.scrollTop && top <= transcript.scrollTop + transcript.clientHeight;
}

function jumpToMessage(transcript: HTMLDivElement | null, id: string) {
  const article = transcript ? messageArticles(transcript).get(id) : undefined;
  if (!article || !transcript) return;
  transcript.scrollTo({ behavior: "smooth", top: Math.max(0, article.offsetTop - 16) });
}
