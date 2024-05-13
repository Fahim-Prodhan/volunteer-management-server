const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173","https://volunnet-1c3ea.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log("value of token in middleware:", token);
  if (!token) {
    return res.status(401).send({ message: "Not authorized" });
  }
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    //error
    if (err) {
      // console.log(err);
      return res.status(401).send({ message: "Unauthorized" });
    }
    // if token is valid then it would be decoded
    // console.log("value of token", decoded);
    req.user = decoded;
  });

  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.djweinm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const volunteerCollection = client
      .db("volunnetDB")
      .collection("volunteerCollections");
    const BeVolunteerCollection = client
      .db("volunnetDB")
      .collection("beVolunteerCollections");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: "1h" });
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      };
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // Volunteer
    app.get("/volunteerPosts", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const text = req.query.search;
      let query = {
        title: { $regex: text, $options: "i" },
      };
      const result = await volunteerCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/posts", async (req, res) => {
      const result = await volunteerCollection
        .find()
        .sort({ deadline: 1 })
        .toArray();
      res.send(result);
    });

    app.get("/volunteerPost/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteerCollection.findOne(query);
      res.send(result);
    });

    app.get("/postCounts", async (req, res) => {
      const text = req.query.search;
      let query = {
        title: { $regex: text, $options: "i" },
      };
      const result = await volunteerCollection.countDocuments(query);
      res.send({ count: result });
    });

    app.post("/volunteerPost", verifyToken, async (req, res) => {
      if (req.query.email != req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const body = req.body;
      // console.log(body);
      const result = await volunteerCollection.insertOne(body);
      res.send(result);
    });

    app.post("/beVolunteerPost/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      // console.log(id);
      const result = await BeVolunteerCollection.insertOne(body);
      const incrementQuery = { _id: new ObjectId(id) };
      const incrementUpdate = { $inc: { volunteers_needed: -1 } };
      await volunteerCollection.updateOne(incrementQuery, incrementUpdate);
      res.send(result);
    });

    app.get("/myPosts", verifyToken, async (req, res) => {
      if (req.query.email != req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await volunteerCollection.find(query).sort({_id: -1}).toArray();
      res.send(result);
    });

    app.delete("/myPosts/:id", verifyToken, async (req, res) => {
      if (req.query.email != req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const find = await volunteerCollection.findOne(query);
      if (find) {
        const result = await volunteerCollection.deleteOne(query);
        res.send(result);
      } else {
        const result = await BeVolunteerCollection.deleteOne(query);
        res.send(result);
      }
    });

    app.put('/myPost/update/:id', verifyToken, async(req, res)=>{
      if (req.query.email != req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const id = req.params.id
      const post = req.body
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatePost = {
        $set: {
          image:post.image,
          title:post.title,
          description:post.description,
          category:post.category,
          location:post.location,
          volunteers_needed:post.volunteers_needed,
          deadline:post.deadline,
          email:post.email,
          name:post.name,
        }
      }
      const result = await volunteerCollection.updateOne(filter, updatePost, options);
      res.send(result);
    })

    app.get("/myRequestedPosts", verifyToken, async (req, res) => {
      if (req.query.email != req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      let query = {};
      if (req.query?.email) {
        query = { volunteer_email: req.query.email };
      }
      const result = await BeVolunteerCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/myRequestedPosts/:id', verifyToken, async(req, res)=>{
      if (req.query.email != req.user.email) {
        return res.status(403).send({ message: "forbidden" });
      }
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await BeVolunteerCollection.deleteOne(query);
      res.send(result);
    })


    app.post('/logout', async(req,res)=>{
      const user = req.body
      res.clearCookie('token', {maxAge:0}).send({success:true})
  })

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {

  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Testing Server");
});
app.listen(port, () => {
  console.log("coffee shop running at ", port);
});
