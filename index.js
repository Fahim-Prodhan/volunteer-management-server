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
      origin: ["http://localhost:5173"],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());


  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.djweinm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {

    const volunteerCollection = client.db('volunnetDB').collection('volunteerCollections')

    // Volunteer
    app.get('/volunteerPosts', async(req,res)=>{
      const result = await volunteerCollection.find().sort({_id: -1}).toArray()
      res.send(result)
    })

    app.post('/volunteerPost', async(req, res)=>{
      const body = req.body
      console.log(body);
      const result = await volunteerCollection.insertOne(body)
      res.send(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
 
  }
}
run().catch(console.dir);

app.get('/', async(req,res)=>{
    res.send("Testing Server")
})
app.listen(port, () => {
    console.log("coffee shop running at ", port);
  });
  