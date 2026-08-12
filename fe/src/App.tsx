import { useEffect, useState } from "react";
import "./index.css";

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000";

type Post = {
    id: number;
    content: string;
    created_at: string;
    updated_at: string;
    authorId: number;
    author?: {
        username: string;
    };
};

type Comment = {
    id: number;
    content: string;
    created_at: string;
    updated_at: string;
    authorId: number;
    postId: number;
    author?: {
        username: string;
    };
};

type AuthResponse = {
    message?: string;
    token?: string;
};

type PostsResponse = {
    posts: Post[];
};

type PostResponse = {
    post: Post;
};

type CommentsResponse = {
    comments: Comment[];
};

function getUserIdFromToken(token: string): number | null {
    try {
        const payload = token.split(".")[1];

        if (!payload) {
            return null;
        }

        const base64 = payload
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const decoded = JSON.parse(atob(base64));

        return typeof decoded.userid === "number"
            ? decoded.userid
            : null;
    } catch {
        return null;
    }
}

function App() {
    const [token, setToken] = useState<string | null>(
        localStorage.getItem("token")
    );

    const [username, setUsername] = useState(
        localStorage.getItem("username") || ""
    );

    const [userId, setUserId] = useState<number | null>(() => {
        const savedToken = localStorage.getItem("token");

        return savedToken
            ? getUserIdFromToken(savedToken)
            : null;
    });

    const [showAuth, setShowAuth] = useState(false);

    const [authMode, setAuthMode] = useState<
        "login" | "signup"
    >("signup");

    const [authUsername, setAuthUsername] = useState("");
    const [authPassword, setAuthPassword] = useState("");

    const [posts, setPosts] = useState<Post[]>([]);
    const [newPost, setNewPost] = useState("");

    const [editingPostId, setEditingPostId] =
        useState<number | null>(null);

    const [editingContent, setEditingContent] =
        useState("");

    const [comments, setComments] = useState<
        Record<number, Comment[]>
    >({});

    const [commentInputs, setCommentInputs] =
        useState<Record<number, string>>({});

    const [likedPosts, setLikedPosts] = useState<
        Record<number, boolean>
    >({});

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    });

    function showMessage(msg: string) {
        setMessage(msg);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }

    async function handleAuth() {
        setLoading(true);
        setMessage("");

        try {
            const endpoint =
                authMode === "login"
                    ? "/login"
                    : "/signup";

            const response = await fetch(
                API_URL + endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: authUsername,
                        password: authPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        (data.errors
                            ? JSON.stringify(data.errors)
                            : "Request failed")
                );

                return;
            }

            if (authMode === "signup") {
                showMessage(
                    "Account created. Please log in."
                );

                setAuthMode("login");
                setAuthPassword("");

                return;
            }

            const authData = data as AuthResponse;

            if (!authData.token) {
                showMessage(
                    "Login succeeded but no token was returned."
                );

                return;
            }

            const decodedUserId =
                getUserIdFromToken(authData.token);

            localStorage.setItem(
                "token",
                authData.token
            );

            localStorage.setItem(
                "username",
                authUsername
            );

            setToken(authData.token);
            setUsername(authUsername);
            setUserId(decodedUserId);

            setAuthUsername("");
            setAuthPassword("");

            setShowAuth(false);

            showMessage("Welcome to miniSocial.");
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        } finally {
            setLoading(false);
        }
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("username");

        setToken(null);
        setUsername("");
        setUserId(null);

        setPosts([]);
        setComments({});
        setLikedPosts({});
    }

    async function fetchPosts() {
        if (!token) {
            return;
        }

        try {
            const response = await fetch(
                API_URL + "/posts",
                {
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not load posts."
                );

                return;
            }

            const result =
                data as PostsResponse;

            setPosts(result.posts);
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function createPost() {
        if (!newPost.trim()) {
            showMessage("Post cannot be empty.");
            return;
        }

        try {
            const response = await fetch(
                API_URL + "/post",
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        content: newPost,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not create post."
                );

                return;
            }

            const result =
                data as PostResponse;

            setPosts((current) => [
                result.post,
                ...current,
            ]);

            setNewPost("");

            showMessage("Post created.");
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function updatePost(postId: number) {
        if (!editingContent.trim()) {
            showMessage("Post cannot be empty.");
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/post/${postId}`,
                {
                    method: "PATCH",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        content: editingContent,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not update post."
                );

                return;
            }

            const result =
                data as PostResponse;

            setPosts((current) =>
                current.map((post) =>
                    post.id === postId
                        ? {
                              ...post,
                              ...result.post,
                          }
                        : post
                )
            );

            setEditingPostId(null);
            setEditingContent("");

            showMessage("Post updated.");
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function deletePost(postId: number) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this post?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/post/${postId}`,
                {
                    method: "DELETE",
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not delete post."
                );

                return;
            }

            setPosts((current) =>
                current.filter(
                    (post) => post.id !== postId
                )
            );

            setComments((current) => {
                const copy = { ...current };
                delete copy[postId];
                return copy;
            });

            showMessage("Post deleted.");
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function fetchComments(postId: number) {
        try {
            const response = await fetch(
                `${API_URL}/post/${postId}/comments`,
                {
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not load comments."
                );

                return;
            }

            const result =
                data as CommentsResponse;

            setComments((current) => ({
                ...current,
                [postId]: result.comments,
            }));
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function createComment(postId: number) {
        const content =
            commentInputs[postId] || "";

        if (!content.trim()) {
            showMessage(
                "Comment cannot be empty."
            );

            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/post/${postId}/comment`,
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        content,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not create comment."
                );

                return;
            }

            const comment =
                data.comment as Comment;

            setComments((current) => ({
                ...current,
                [postId]: [
                    ...(current[postId] || []),
                    comment,
                ],
            }));

            setCommentInputs((current) => ({
                ...current,
                [postId]: "",
            }));

            showMessage("Comment added.");
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function deleteComment(
        comment: Comment
    ) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this comment?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/comment/${comment.id}`,
                {
                    method: "DELETE",
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not delete comment."
                );

                return;
            }

            setComments((current) => ({
                ...current,
                [comment.postId]: (
                    current[comment.postId] || []
                ).filter(
                    (item) =>
                        item.id !== comment.id
                ),
            }));

            showMessage("Comment deleted.");
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function likePost(postId: number) {
        try {
            const response = await fetch(
                `${API_URL}/post/${postId}/like`,
                {
                    method: "POST",
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not like post."
                );

                return;
            }

            setLikedPosts((current) => ({
                ...current,
                [postId]: true,
            }));
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    async function unlikePost(postId: number) {
        try {
            const response = await fetch(
                `${API_URL}/post/${postId}/like`,
                {
                    method: "DELETE",
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showMessage(
                    data.message ||
                        "Could not unlike post."
                );

                return;
            }

            setLikedPosts((current) => ({
                ...current,
                [postId]: false,
            }));
        } catch {
            showMessage(
                "Could not connect to backend."
            );
        }
    }

    useEffect(() => {
        if (token) {
            fetchPosts();
        }
    }, [token]);

    /*
     * ========================================
     * LANDING PAGE
     * ========================================
     */

    if (!token && !showAuth) {
        return (
            <div className="landing-page">
                <nav className="landing-nav">
                    <div className="landing-logo">
                        miniSocial
                    </div>

                    <button
                        className="secondary-button"
                        onClick={() => {
                            setAuthMode("login");
                            setShowAuth(true);
                        }}
                    >
                        Log in
                    </button>
                </nav>

                <main className="landing-main">
                    <section className="hero">
                        <p className="eyebrow">
                            PSEUDONYMOUS SOCIAL
                        </p>

                        <h1>
                            Say what you
                            <br />
                            actually think.
                        </h1>

                        <p className="hero-description">
                            A social space where the
                            conversation comes first.
                            Use a username, share what's
                            on your mind, and keep your
                            real-world identity out of
                            the feed.
                        </p>

                        <div className="hero-actions">
                            <button
                                className="primary-button hero-button"
                                onClick={() => {
                                    setAuthMode(
                                        "signup"
                                    );
                                    setShowAuth(true);
                                }}
                            >
                                Join miniSocial
                            </button>

                            <button
                                className="secondary-button hero-button"
                                onClick={() => {
                                    setAuthMode(
                                        "login"
                                    );
                                    setShowAuth(true);
                                }}
                            >
                                I have an account
                            </button>
                        </div>
                    </section>

                    <section className="principles">
                        <article className="principle">
                            <span className="principle-number">
                                01
                            </span>

                            <div>
                                <h3>
                                    Privacy, without
                                    the isolation
                                </h3>

                                <p>
                                    Keep your real-world
                                    identity out of the
                                    feed. Show up through
                                    a username and
                                    participate on your
                                    own terms.
                                </p>
                            </div>
                        </article>

                        <article className="principle">
                            <span className="principle-number">
                                02
                            </span>

                            <div>
                                <h3>
                                    No email. No
                                    personal profile.
                                    Just join.
                                </h3>

                                <p>
                                    Create an account
                                    with a username and
                                    password. No email
                                    address or personal
                                    profile required to
                                    start participating.
                                </p>
                            </div>
                        </article>

                        <article className="principle">
                            <span className="principle-number">
                                03
                            </span>

                            <div>
                                <h3>
                                    Conversations over
                                    clout
                                </h3>

                                <p>
                                    No follower counts,
                                    personal-brand
                                    pressure, or chasing
                                    reach. Build a space
                                    around conversations
                                    worth having, not
                                    numbers worth growing.
                                </p>
                            </div>
                        </article>
                    </section>

                    <footer className="landing-footer">
                        <span>
                            miniSocial
                        </span>

                        <span>
                            Less profile. More
                            conversation.
                        </span>
                    </footer>
                </main>
            </div>
        );
    }

    /*
     * ========================================
     * AUTH PAGE
     * ========================================
     */

    if (!token && showAuth) {
        return (
            <div className="auth-page">
                <div className="auth-box">
                    <button
                        className="text-button"
                        onClick={() =>
                            setShowAuth(false)
                        }
                    >
                        ← Back
                    </button>

                    <h1>miniSocial</h1>

                    <p className="muted">
                        Less profile. More
                        conversation.
                    </p>

                    <div className="auth-tabs">
                        <button
                            className={
                                authMode === "login"
                                    ? "tab active"
                                    : "tab"
                            }
                            onClick={() =>
                                setAuthMode("login")
                            }
                        >
                            Login
                        </button>

                        <button
                            className={
                                authMode === "signup"
                                    ? "tab active"
                                    : "tab"
                            }
                            onClick={() =>
                                setAuthMode("signup")
                            }
                        >
                            Sign up
                        </button>
                    </div>

                    <label>
                        Username
                    </label>

                    <input
                        value={authUsername}
                        onChange={(e) =>
                            setAuthUsername(
                                e.target.value
                            )
                        }
                        placeholder="Choose a username"
                        autoComplete="username"
                    />

                    <label>
                        Password
                    </label>

                    <input
                        type="password"
                        value={authPassword}
                        onChange={(e) =>
                            setAuthPassword(
                                e.target.value
                            )
                        }
                        placeholder="At least 8 characters"
                        autoComplete={
                            authMode === "login"
                                ? "current-password"
                                : "new-password"
                        }
                    />

                    <button
                        className="primary-button"
                        onClick={handleAuth}
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : authMode === "login"
                              ? "Log in"
                              : "Create account"}
                    </button>

                    {authMode === "signup" && (
                        <p className="auth-note">
                            No email address required.
                        </p>
                    )}

                    {message && (
                        <div className="message">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /*
     * ========================================
     * APPLICATION
     * ========================================
     */

    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                    <strong>
                        miniSocial
                    </strong>

                    <div className="topbar-right">
                        <span className="user-label">
                            User #{userId}
                        </span>

                        <button
                            className="secondary-button"
                            onClick={logout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="feed">
                {message && (
                    <div className="notice">
                        {message}
                    </div>
                )}

                <section className="composer">
                    <textarea
                        value={newPost}
                        onChange={(e) =>
                            setNewPost(
                                e.target.value
                            )
                        }
                        placeholder="What's on your mind?"
                        maxLength={500}
                    />

                    <div className="composer-footer">
                        <span className="character-count">
                            {newPost.length}/500
                        </span>

                        <button
                            className="primary-button"
                            onClick={createPost}
                        >
                            Post
                        </button>
                    </div>
                </section>

                <div className="feed-header">
                    <h2>
                        Latest conversations
                    </h2>

                    <button
                        className="text-button"
                        onClick={fetchPosts}
                    >
                        Refresh
                    </button>
                </div>

                <section className="posts">
                    {posts.length === 0 ? (
                        <div className="empty">
                            No conversations yet.
                        </div>
                    ) : (
                        posts.map((post) => (
                            <article
                                className="post"
                                key={post.id}
                            >
                                <div className="post-header">
                                    <strong>
                                        User #
                                        {post.authorId}
                                    </strong>

                                    <time>
                                        {new Date(
                                            post.created_at
                                        ).toLocaleString()}
                                    </time>
                                </div>

                                {editingPostId ===
                                post.id ? (
                                    <>
                                        <textarea
                                            value={
                                                editingContent
                                            }
                                            onChange={(e) =>
                                                setEditingContent(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            maxLength={500}
                                        />

                                        <div className="inline-actions">
                                            <button
                                                className="primary-button"
                                                onClick={() =>
                                                    updatePost(
                                                        post.id
                                                    )
                                                }
                                            >
                                                Save
                                            </button>

                                            <button
                                                className="secondary-button"
                                                onClick={() => {
                                                    setEditingPostId(
                                                        null
                                                    );
                                                    setEditingContent(
                                                        ""
                                                    );
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="post-content">
                                        {post.content}
                                    </div>
                                )}

                                <div className="post-actions">
                                    <button
                                        className={
                                            likedPosts[
                                                post.id
                                            ]
                                                ? "action-button liked"
                                                : "action-button"
                                        }
                                        onClick={() =>
                                            likedPosts[
                                                post.id
                                            ]
                                                ? unlikePost(
                                                      post.id
                                                  )
                                                : likePost(
                                                      post.id
                                                  )
                                        }
                                    >
                                        {likedPosts[
                                            post.id
                                        ]
                                            ? "Unlike"
                                            : "Like"}
                                    </button>

                                    <button
                                        className="action-button"
                                        onClick={() =>
                                            fetchComments(
                                                post.id
                                            )
                                        }
                                    >
                                        Comments
                                    </button>

                                    {post.authorId ===
                                        userId && (
                                        <>
                                            <button
                                                className="action-button"
                                                onClick={() => {
                                                    setEditingPostId(
                                                        post.id
                                                    );
                                                    setEditingContent(
                                                        post.content
                                                    );
                                                }}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className="action-button danger"
                                                onClick={() =>
                                                    deletePost(
                                                        post.id
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>

                                {comments[
                                    post.id
                                ] && (
                                    <section className="comments">
                                        <strong>
                                            Comments
                                        </strong>

                                        <div className="comment-list">
                                            {comments[
                                                post.id
                                            ].length ===
                                            0 ? (
                                                <p className="muted">
                                                    No comments yet.
                                                </p>
                                            ) : (
                                                comments[
                                                    post.id
                                                ].map(
                                                    (
                                                        comment
                                                    ) => (
                                                        <div
                                                            className="comment"
                                                            key={
                                                                comment.id
                                                            }
                                                        >
                                                            <div className="comment-header">
                                                                <strong>
                                                                    User #
                                                                    {
                                                                        comment.authorId
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    {new Date(
                                                                        comment.created_at
                                                                    ).toLocaleString()}
                                                                </span>
                                                            </div>

                                                            <p>
                                                                {
                                                                    comment.content
                                                                }
                                                            </p>

                                                            {comment.authorId ===
                                                                userId && (
                                                                <div className="inline-actions">
                                                                    <button
                                                                        className="text-button danger"
                                                                        onClick={() =>
                                                                            deleteComment(
                                                                                comment
                                                                            )
                                                                        }
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                )
                                            )}
                                        </div>

                                        <div className="comment-composer">
                                            <input
                                                value={
                                                    commentInputs[
                                                        post.id
                                                    ] || ""
                                                }
                                                onChange={(e) =>
                                                    setCommentInputs(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,
                                                            [post.id]:
                                                                e
                                                                    .target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                                placeholder="Write a comment..."
                                                maxLength={500}
                                            />

                                            <button
                                                className="primary-button"
                                                onClick={() =>
                                                    createComment(
                                                        post.id
                                                    )
                                                }
                                            >
                                                Comment
                                            </button>
                                        </div>
                                    </section>
                                )}
                            </article>
                        ))
                    )}
                </section>
            </main>
        </>
    );
}

export default App;