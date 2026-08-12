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

app.post("/me",(req,res)=>{
    res.status(200).send("Okay");
})

app.post("/signup",async (req,res)=>{

    const signupSchema = z.object({
            username: z.string().min(3).max(30),
            password: z.string().min(8).max(100),
            });

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
    const loginSchema = z.object({
            username: z.string().min(3).max(30),
            password: z.string().min(8).max(100),
            });

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

    if(user === null){
        return res.json({
            "msg":"please create an account first"
        })
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
    const {content} = req.body;

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
    const newContent = req.body.newContent;
    const post = await prisma.post.update({
        where:{
            id:postId
        },
        data:{
            content:newContent,
            updated_at:new Date()
        }
    });
    return res.json({
        post
    });
})

app.delete("/post/:id",auth,async(req,res)=>{
    const postId = Number(req.params.id);
    await prisma.post.delete({
        where:{
            id:postId
        }
    });

        return res.json({
        "msg":"post successfully deleted"
    });
});

app.use(errorHandler);


app.listen(port,()=>{
    console.log("listening on port "+ port)
})