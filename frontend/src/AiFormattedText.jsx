import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders AI advisor markdown: bold, lists, tables (GFM).
 */
export default function AiFormattedText({ content, className = "" }) {
  if (!content) return null;

  return (
    <div className={`ai-formatted-text ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="ai-md-p">{children}</p>,
          strong: ({ children }) => <strong className="ai-md-strong">{children}</strong>,
          ul: ({ children }) => <ul className="ai-md-ul">{children}</ul>,
          ol: ({ children }) => <ol className="ai-md-ol">{children}</ol>,
          li: ({ children }) => <li className="ai-md-li">{children}</li>,
          table: ({ children }) => (
            <div className="ai-md-table-wrap">
              <table className="ai-md-table">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="ai-md-thead">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
