const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 5050;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new MongoClient(process.env.MONGO_URI);
let usersCollection;

async function connectDB() {
    await client.connect();
    const db = client.db("farmUsers");
    usersCollection = db.collection("users");
    traceCollection=db.collection("traceability")
}
connectDB().catch(console.error);

app.get("/api/vendors", async (req, res) => {
    try {
        const users = await usersCollection.find({}).toArray();
        // Map only required details for frontend
        const vendors = users.map(user => ({
            _id: user._id,               // include MongoDB id
            name: user.name,
            location: user.location,
            rating: Math.floor(Math.random() * 5) + 1, // example random rating
            img:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm5zQ8_hzz-tUHMgsK6PqY8KcCrq4wCgMnmQ&s" , // use user's image if exists
            products: user.products || []  // include products array
        }));
        res.json(vendors);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching vendors");
    }
});
// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // TODO: Use hashed passwords in production
});

const User = mongoose.model('User', userSchema);

// Order schema
const orderSchema = new mongoose.Schema({
  customerName: String,
  customerAddress: String,
  items: Array,
  totalAmount: Number,
  orderDate: String,
  orderId: Number,
});

const Order = mongoose.model('Order', orderSchema);

// ---------- Routes ---------- //

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const newUser = new User({ name, email, password });
    await newUser.save();

    res.status(201).json({ message: 'Registration successful', user: { _id: newUser._id, name, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(400).json({ error: 'Invalid email or password' });

    res.status(200).json({ message: 'Login successful', user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user by email
app.put('/api/users/:email', async (req, res) => {
  const { email } = req.params;
  const updateData = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate({ email }, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete user by email
app.delete('/api/users/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const deletedUser = await User.findOneAndDelete({ email });
    if (!deletedUser) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// Confirm payment / create order
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(200).json({ message: 'Order confirmed!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm order.' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
