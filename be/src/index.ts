import express from "express";
import {prisma} from "../lib/prisma.ts";
import { z } from "zod";
import jwt from "jsonwebtoken";
import {auth} from "./auth";
import {errorHandler} from "./error.ts";

const jwt_secret = process.env["JWT_SECRET"]!;
const port = process.env["PORT"];

const app = express();

app.use(express.json());

const signupSchema = z.object({
            username: z.string().min(3).max(30),
            password: z.string().min(8).max(100),
            });


const loginSchema = z.object({
            username: z.string().min(3).max(30),
            password: z.string().min(8).max(100),
            });

 const postSchema = z.object({
    content: z.string().min(1).max(500)
});

app.post("/me",(req,res)=>{
    res.status(200).send("Okay");
})

app.post("/signup",async (req,res)=>{

    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
            return res.status(400).json({
                    message: "Invalid input",
                    errors: result.error.flatten().fieldErrors,
                    });
        }

    const { username, password } = result.data;
    const isExistingUser = await prisma.user.findFirst({
        where:{
            username:username
        }
    });

    if(isExistingUser){
        return res.status(409).json({
            "message":"User "+ username + " already exists"
        });
    }

    const hashedPassword = await Bun.password.hash(password);

    const user = await prisma.user.create({
        data:{
            username:username,
            password:hashedPassword,
            created_at:new Date()
        }
    });

    return res.status(201).json({
        "message":"User "+user.username + " created successfully"
    });

})

app.post("/login",async (req,res)=>{

    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
            return res.status(400).json({
                    message: "Invalid input",
                    errors: result.error.flatten().fieldErrors,
                    });
        }

    const { username, password } = result.data;

    const user = await prisma.user.findUnique({
        where:{
            username:username
        }
    });

    if (!user) {
    return res.status(401).json({
        message: "Invalid username or password"
    });
}

    const hashedPassword = user.password;
    const isValid = await Bun.password.verify(password,hashedPassword);
    if (!isValid) {
        return res.status(401).json({
        message: "Invalid password"
    });
    }

    const token = jwt.sign({
        userid:user?.id
    },jwt_secret);

    return res.status(200).json({
            message: "Login successful",
            token,
        });

}
)

//-----------AUTHENTICATED ENDPOINTS --------------

app.post("/post",auth,async (req,res)=>{
    const userId = req.userId;

   

   const result = postSchema.safeParse(req.body);

    if (!result.success) {
            return res.status(400).json({
                    message: "Invalid input",
                    errors: result.error.flatten().fieldErrors,
                    });
        }

    const { content } = result.data;


    const post = await prisma.post.create({
        data:{
            content:content,
            created_at:new Date(),
            updated_at:new Date(),
            authorId:userId
        }
    });

    return res.status(201).json({
        post
    });
});

app.get("/posts",auth,async(req,res)=>{
    const userId = req.userId;
    const posts = (await prisma.post.findMany({
        orderBy:{
            created_at:"desc"
        }
    }))
    return res.json({
        posts
    })
});

app.get("/post/:id",auth,async(req,res)=>{
    const userId = req.userId;
    const postId = Number(req.params.id);
    const post = await prisma.post.findUnique({
        where:{
            id:postId
        }
    });
    if (!post) {
    return res.status(404).json({
        message: "Post not found"
    });
}


    return res.json(post);
})

app.patch("/post/:id", auth , async (req,res)=>{
    const userId = req.userId;
    const postId = Number(req.params.id);
    const result = postSchema.safeParse(req.body);

    if (!result.success) {
            return res.status(400).json({
                    message: "Invalid input",
                    errors: result.error.flatten().fieldErrors,
                    });
        }

    const { content } = result.data;
  
    const post = await prisma.post.findUnique({
        where: {
            id: postId
        }
    });
    if (!post) {
        return res.status(404).json({
            message: "Post not found"
        });
    }

    if (post.authorId !== userId) {
        return res.status(403).json({
            message: "You don't own this post"
        });
    }

    const newPost = await prisma.post.update({
        where:{
            id:postId
        },
        data:{
            content:content,
            updated_at:new Date()
        }
    });


    return res.json({
        post:newPost
    });    

});
    
app.delete("/post/:id",auth,async(req,res)=>{
    const postId = Number(req.params.id);
    const userId = req.userId;

    const post = await prisma.post.findUnique({
        where: {
            id: postId
        }
    });
    if (!post) {
        return res.status(404).json({
            message: "Post not found"
        });
    }

    if (post.authorId !== userId) {
        return res.status(403).json({
            message: "You don't own this post"
        });
    }

    await prisma.post.delete({
        where:{
            id:postId
        }
    });

        return res.json({
        "msg":"post successfully deleted"
    });
});

app.post("/post/:id/comment", auth ,async (req,res)=>{
    const userId = req.userId;
    const postId = Number(req.params.id);
    
    const post = await prisma.post.findUnique({
        where:{
            id:postId
        }
    });

    if(post === null){
        return res.status(404).json({
            "message":"no such post exists"
        })
    }
    const commentSchema = z.object({
        content: z.string().min(1).max(500)
    });

    const result = commentSchema.safeParse(req.body);

    if (!result.success) {
            return res.status(400).json({
                    message: "Invalid input",
                    errors: result.error.flatten().fieldErrors,
                    });
        }

    const { content  } = result.data;


    const comment = await prisma.comment.create({
        data:{
            content:content,
            created_at:new Date(),
            updated_at:new Date(),
            authorId:userId,
            postId:postId
        }
    });

    res.status(201).json({
        comment
    });
});

app.get("/post/:id/comments", auth , async(req,res)=>{
    const userId = req.userId;
    const postId = Number(req.params.id);

    const comments = await prisma.comment.findMany({
        where:{
            postId
        }
    });

    return res.status(201).json({
        comments
    })
})

app.patch("/comments/:id", auth , async (req,res)=>{
    const userId = req.userId;
    const commentId = Number(req.params.id);

    const commentSchema = z.object({
        content: z.string().min(1).max(500)
    });

    const result = commentSchema.safeParse(req.body);

    if (!result.success) {
            return res.status(400).json({
                    message: "Invalid input",
                    errors: result.error.flatten().fieldErrors,
                    });
        }

    const { content  } = result.data;

    const comment = await prisma.comment.findUnique({
        where:{
            id:commentId
        }
    });
    if(comment === null){
            return res.status(400).json({
                "message":"No such comment exists"
            })
    }

    if(comment.authorId != userId){
        return res.status(403).json({
            "message":"This is not your comment"
        })
    }

    const updatedComment = await prisma.comment.update({
        where:{
            id:commentId
        },
        data:{
            content:content,
            updated_at:new Date()
        }
    })

    return res.status(200).json({
        comment:updatedComment
    })



})

app.delete("/comment/:id", auth ,async (req,res)=>{
    const userId = req.userId;
    const commentId = Number(req.params.id);

    const comment = await prisma.comment.findUnique({
        where:{
            id:commentId
        }
    });
    if(comment === null){
            return res.status(404).json({
                "message":"No such comment exists"
            })
    }

    if(comment.authorId != userId){
        return res.status(403).json({
            "message":"This is not your comment"
        })
    }

    await prisma.comment.delete({
        where:{
            id:commentId
        }
    });

    return res.status(200).json({
        "message":"comment deleted"
    });

})
app.post("/post/:id/like", auth, async (req, res) => {
    const userId = req.userId;
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId)) {
        return res.status(400).json({
            message: "Invalid post ID"
        });
    }

    const post = await prisma.post.findUnique({
        where: {
            id: postId
        }
    });

    if (!post) {
        return res.status(404).json({
            message: "Post not found"
        });
    }

    const existingLike = await prisma.like.findUnique({
        where: {
            userId_postId: {
                userId,
                postId
            }
        }
    });

    if (existingLike) {
        return res.status(409).json({
            message: "Post already liked"
        });
    }

    const like = await prisma.like.create({
        data: {
            userId,
            postId,
            created_at: new Date()
        }
    });

    return res.status(201).json({
        like
    });
});

app.delete("/post/:id/like", auth, async (req, res) => {
    const userId = req.userId;
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId)) {
        return res.status(400).json({
            message: "Invalid post ID"
        });
    }

    const existingLike = await prisma.like.findUnique({
        where: {
            userId_postId: {
                userId,
                postId
            }
        }
    });

    if (!existingLike) {
        return res.status(404).json({
            message: "Like not found"
        });
    }

    await prisma.like.delete({
        where: {
            userId_postId: {
                userId,
                postId
            }
        }
    });

    return res.status(200).json({
        message: "Post unliked"
    });
});
app.use(errorHandler);


app.listen(port,()=>{
    console.log("listening on port "+ port)
})