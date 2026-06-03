import { useCallback, useEffect, useId, useRef, useState } from "react";
import { sendChatMessage } from "./api";
import AiFormattedText from "./AiFormattedText";

const WELCOME_MESSAGE =
  "Hi — I'm your **Credit Advisor**. Ask about your score, reason codes, or how to improve it.";

const SUGGESTED_QUESTIONS = [
  "Why is my score low?",
  "How can I improve my score?",
  "What factors affect my score?",
];

function createMessage(role, text) {
  return { id: crypto.randomUUID(), role, text };
}

export default function CreditAdvisorChat({
  open,
  onOpenChange,
  profileRequestId,
  onClearProfile,
  fallbackRequestId,
}) {
  const [messages, setMessages] = useState(() => [createMessage("bot", WELCOME_MESSAGE)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const titleId = useId();

  const activeRequestId = profileRequestId || fallbackRequestId || null;
  const hasUserMessages = messages.some((m) => m.role === "user");
  const showSuggestions = open && !hasUserMessages && !loading;

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom("instant");
      focusInput();
    }
  }, [open, focusInput, scrollToBottom]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, loading, open, scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const prevOverflow = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  const handleNewChat = () => {
    setMessages([createMessage("bot", WELCOME_MESSAGE)]);
    setInput("");
    setLoading(false);
    focusInput();
  };

  const handleClearProfile = () => {
    onClearProfile?.();
    setMessages((prev) => [
      ...prev,
      createMessage(
        "system",
        "Profile unlinked. You can still ask general SaakhSetu questions, or run a new score to load a profile."
      ),
    ]);
    focusInput();
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, createMessage("user", trimmed)]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChatMessage(trimmed, activeRequestId);
      setMessages((prev) => [...prev, createMessage("bot", data.response)]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        createMessage(
          "error",
          err.message || "Failed to reach SaakhSetu Advisor. Check that the backend is running."
        ),
      ]);
    } finally {
      setLoading(false);
      focusInput();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className={`floating-chat-container ${open ? "is-open" : ""}`}>
      {open && (
        <button
          type="button"
          className="chat-backdrop"
          aria-label="Close chat"
          onClick={() => onOpenChange(false)}
        />
      )}

      {open && (
        <div
          id="advisor-chat-panel"
          className="chat-popup-box glass-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className="chat-header">
            <div className="chat-header-left">
              <img src="/favicon.png" alt="" className="chat-header-logo" />
              <div className="chat-header-text">
                <h3 id={titleId}>Credit Advisor</h3>
                <span className="online-indicator">Online</span>
              </div>
            </div>
            <div className="chat-header-right-actions">
              <button
                type="button"
                className="chat-action-btn chat-new-btn"
                onClick={handleNewChat}
                title="Start a new conversation"
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                <span className="chat-action-label">New chat</span>
              </button>
              <button
                type="button"
                className="chat-action-btn chat-close-btn"
                onClick={() => onOpenChange(false)}
                aria-label="Close chat"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </header>

          <div className="chat-context-banner">
            {activeRequestId ? (
              <>
                <span className="chat-context-text">
                  Profile linked · <strong className="monospace">{activeRequestId.substring(0, 8)}…</strong>
                </span>
                <button
                  type="button"
                  className="chat-context-clear"
                  onClick={handleClearProfile}
                  disabled={loading}
                >
                  Unlink
                </button>
              </>
            ) : (
              <span className="chat-context-text">No profile linked — run a score or use History → Inspect</span>
            )}
          </div>

          <div className="chat-messages-body" role="log" aria-live="polite" aria-relevant="additions">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message-bubble ${msg.role}`}>
                {msg.role === "bot" ? (
                  <AiFormattedText content={msg.text} />
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-message-bubble bot typing-loading" aria-label="Advisor is typing">
                <span className="loader-dot" />
                <span className="loader-dot" />
                <span className="loader-dot" />
              </div>
            )}
            <div ref={messagesEndRef} className="chat-messages-anchor" aria-hidden="true" />
          </div>

          {showSuggestions && (
            <div className="chat-suggested-prompts" role="group" aria-label="Suggested questions">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="suggested-prompt-btn"
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form className="chat-input-footer" onSubmit={handleSubmit}>
            <label className="chat-input-label" htmlFor="advisor-chat-input">
              Message
            </label>
            <div className="chat-input-row">
              <div className="chat-input-container-inner">
                <textarea
                  id="advisor-chat-input"
                  ref={inputRef}
                  rows={1}
                  placeholder="Ask the advisor…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  disabled={loading}
                  maxLength={250}
                  aria-describedby="advisor-char-count"
                />
                <span id="advisor-char-count" className="char-counter">
                  {input.length}/250
                </span>
              </div>
              <button
                type="submit"
                className="chat-send-btn"
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`chat-fab-trigger ${open ? "active" : ""}`}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={open ? "advisor-chat-panel" : undefined}
        aria-label={open ? "Close credit advisor" : "Open credit advisor"}
      >
        {open ? (
          <svg className="chat-fab-close-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        ) : (
          <img src="/favicon.png" alt="" className="chat-fab-logo" />
        )}
      </button>
    </div>
  );
}
