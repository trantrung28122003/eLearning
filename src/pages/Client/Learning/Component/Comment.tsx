import React, { useEffect, useState } from "react";
import "./comments.css";
import { DoCallAPIWithToken } from "../../../../services/HttpService";
import { HTTP_OK } from "../../../../constants/HTTPCode";
import { getTimeAgo } from "../../../../hooks/useTime";
import { BASE_URL } from "../../../../constants/API";
import { getUserInfo } from "../../../../hooks/useLogin";
import { getWebSocketClient } from "../../../../hooks/websocket";
interface Reply {
  id: string;
  userId: string;
  userFullName: string;
  userImageUrl: string;
  dateCreate: string;
  contentReply: string;
}

interface Comment {
  id: string;
  userId: string;
  userFullName: string;
  userImageUrl: string;
  dateCreate: string;
  contentComment: string;
  replies: Reply[];
}

interface CommentsProps {
  trainingPartId: string;
}
const Comments: React.FC<CommentsProps> = ({ trainingPartId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState<string>("");
  const [visibleReplies, setVisibleReplies] = useState<Record<string, boolean>>(
    {}
  );
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(
    null
  );

  const [replyingToReplyId, setReplyingToReplyId] = useState<string | null>(
    null
  );

  const [replyContent, setReplyContent] = useState<string>("");
  
  const toggleReplies = (commentId: string) => {
    setVisibleReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleReplyClick = (commentId: string, userFullName: string) => {
    setReplyingCommentId(commentId);
    setReplyContent("");
    setReplyContent(`@${userFullName.replace(/\s+/g, "")} `);
  };

  const handleCancelReply = () => {
    setReplyContent("");
    setReplyingCommentId(null);
  };

  const handleReplyToReplyId = (replyId: string, userFullName: string) => {
    setReplyingToReplyId(replyId);
    setReplyContent("");
    setReplyContent(`@${userFullName.replace(/\s+/g, "")} `);
  };
  const handleCancelReplyToReplyId = () => {
    setReplyingToReplyId(null);
    setReplyContent("");
  };

  const client = getWebSocketClient();
  useEffect(() => {
    console.log("trainpartiddd neeee", trainingPartId);
    DoCallAPIWithToken(
      BASE_URL + `/comments/commentsByTrainingPart/${trainingPartId}`,
      "GET"
    ).then((res) => {
      if (res.status === HTTP_OK) {
        setComments(res.data.result);
      }
    });

    if (!client.active) {
      client.onConnect = () => {
        client.subscribe("/topic/comments", (content) => {
          const newComment = JSON.parse(content.body);
          setComments((prev) => [...prev, newComment]);
        });
        client.subscribe("/topic/replies", (content) => {
          const newReply = JSON.parse(content.body);
          setComments((prevComments) =>
            prevComments.map((comment) =>
              comment.id === newReply.commentId
                ? { ...comment, replies: [...comment.replies, newReply] }
                : comment
            )
          );
        });
      };

      client.activate();
    }

    return () => {
      if (client.active) client.deactivate();
    };
  }, [client]);

  const handleReplySubmit = (commentId: string, parentReplyUserId?: string) => {
    if (replyContent.trim() === "") return;
    const userInfo = getUserInfo();
    if (client.connected) {
      const replyRequest: any = {
        commentId,
        replyContent: replyContent,
        currentUserId: userInfo?.id,
      };
      if (parentReplyUserId) {
        replyRequest.parentReplyUserId = parentReplyUserId;
      }

      client.publish({
        destination: "/app/reply",
        body: JSON.stringify(replyRequest),
      });
      setReplyingCommentId(null);
      setReplyContent("");
      setReplyingToReplyId(null);
    } else {
      console.error("WebSocket connection is not established.");
    }
  };

  const sendComment = () => {
    if (client.connected) {
      const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");

      const commentRequest = {
        trainingPartId: trainingPartId,
        commentContent: commentContent,
        userId: userInfo.id,
        replies: [],
      };

      client.publish({
        destination: "/app/comment",
        body: JSON.stringify(commentRequest),
      });

      setCommentContent("");
    } else {
      console.error("WebSocket connection is not established.");
    }
  };

  return (
    <>
      <div className="card-body py-1">
        <div>
          <label className="visually-hidden">Comment</label>
          <textarea
            className="form-control form-control-sm border border-2 rounded-1"
            style={{ height: "50px" }}
            placeholder="Add a comment..."
            required
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
          ></textarea>
        </div>
        <footer className="card-footer bg-transparent border-0 text-end">
          <button
            type="button"
            className="btn btn-link btn-sm me-2 text-decoration-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm "
            onClick={sendComment}
            disabled={commentContent.trim() === ""}
          >
            Submit
          </button>
        </footer>
      </div>

      <div className="comments">
        {comments.map((comment) => (
          <section key={comment.id} className="section_comment mb-3">
            <article className="card">
              <header className="card-comment border-0 bg-transparent d-flex align-items-center">
                <div>
                  <img
                    src={comment.userImageUrl}
                    className="rounded-circle me-2"
                    alt="User Avatar"
                  />
                  <span>{comment.userFullName}</span>
                  <small
                    className="ms-3 small text-muted comment-time"
                    data-time={comment.dateCreate}
                  >
                    {getTimeAgo(comment.dateCreate)}
                  </small>
                </div>
              </header>
              <div className="card-body py-2 px-3">
                {comment.contentComment}
              </div>
              <footer className=" bg-white border-0  px-3">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-decoration-none ps-0"
                >
                  <i className="bi bi-hand-thumbs-up me-1"></i>Thích
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-decoration-none reply-btn"
                  onClick={() =>
                    handleReplyClick(comment.id, comment.userFullName)
                  }
                >
                  Phản hồi
                </button>
              </footer>
            </article>
            {/* Hiển thị ô nhập phản hồi nếu comment đang được phản hồi */}
            {replyingCommentId === comment.id && (
              <div className="ms-5 my-2">
                <textarea
                  className="form-control form-control-sm"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Viết phản hồi..."
                ></textarea>
                <button
                  className="btn btn-primary btn-sm mt-2"
                  onClick={() => handleReplySubmit(comment.id)}
                  disabled={replyContent.trim() === ""}
                >
                  Gửi phản hồi
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm me-2 text-decoration-none mt-2 ms-2"
                  onClick={handleCancelReply}
                >
                  Cancel
                </button>
              </div>
            )}
            {/* Hiển thị replies */}
            {comment.replies.length > 0 && (
              <aside>
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="btn btn-link btn-sm text-decoration-none ms-2 my-2"
                >
                  {visibleReplies[comment.id]
                    ? "Ẩn phản hồi"
                    : `Xem ${comment.replies.length} phản hồi`}
                </button>

                {visibleReplies[comment.id] && (
                  <section
                    id={`comment-replies_${comment.id}`}
                    className="ms-5"
                  >
                    {comment.replies &&
                      comment.replies.map((reply) => (
                        <>
                          <article
                            className="card bg-light mb-3"
                            key={reply.contentReply}
                          >
                            <header className="card-comment border-0 bg-transparent">
                              <img
                                src={reply.userImageUrl}
                                className="rounded-circle me-2"
                                alt="User Avatar"
                              />
                              <span>{reply.userFullName}</span>
                              <small
                                className="ms-3 small text-muted comment-time"
                                data-time={reply.dateCreate}
                              >
                                {getTimeAgo(reply.dateCreate)}
                              </small>
                            </header>
                            <div className="card-body py-2 px-3">
                              {reply.contentReply}
                            </div>
                            <footer className=" bg-white border-0 py-1 px-3">
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-decoration-none ps-0"
                              >
                                <i className="bi bi-hand-thumbs-up me-1"></i>
                                Thích
                              </button>
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-decoration-none reply-btn"
                                onClick={() =>
                                  handleReplyToReplyId(
                                    reply.id,
                                    reply.userFullName
                                  )
                                }
                              >
                                Phản hồi
                              </button>
                            </footer>
                          </article>
                          {replyingToReplyId == reply.id && (
                            <div className="ms-5 my-2">
                              <textarea
                                className="form-control form-control-sm"
                                value={replyContent}
                                onChange={(e) =>
                                  setReplyContent(e.target.value)
                                }
                                placeholder="Viết phản hồi..."
                              ></textarea>
                              <button
                                className="btn btn-primary btn-sm mt-2"
                                onClick={() =>
                                  handleReplySubmit(comment.id, reply.userId)
                                }
                                disabled={replyContent.trim() === ""}
                              >
                                Gửi phản hồi
                              </button>
                              <button
                                type="button"
                                className="btn btn-link btn-sm me-2 text-decoration-none mt-2 ms-2"
                                onClick={handleCancelReplyToReplyId}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </>
                      ))}
                  </section>
                )}
              </aside>
            )}
          </section>
        ))}
      </div>
    </>
  );
};

export default Comments;
