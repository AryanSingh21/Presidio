const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/real-estate", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  phoneNumber: String,
  role: { type: String, enum: ["buyer", "seller"] },
});

const propertySchema = new mongoose.Schema({
  sellerId: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
  area: String,
  bedrooms: Number,
  bathrooms: Number,
  price: Number,
  nearbyFacilities: [String],
});

const User = mongoose.model("User", userSchema);
const Property = mongoose.model("Property", propertySchema);

// Routes go here
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register Route
app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password, phoneNumber, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    phoneNumber,
    role,
  });

  try {
    await user.save();
    res.status(201).send("User registered");
  } catch (error) {
    res.status(400).send(error);
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).send("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send("Invalid credentials");
  }

  const token = jwt.sign({ userId: user._id }, "secret");
  res.send({ token });
});
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  const decoded = jwt.verify(token, "secret");
  req.userId = decoded.userId;
  next();
};

// Add Property
app.post("/property", authMiddleware, async (req, res) => {
  const property = new Property({ ...req.body, sellerId: req.userId });

  try {
    await property.save();
    res.status(201).send("Property added");
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get Properties by Seller
app.get("/properties", authMiddleware, async (req, res) => {
  const properties = await Property.find({ sellerId: req.userId });
  res.send("properties");
});

// Update Property
app.put("/property/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const property = await Property.findByIdAndUpdate(id, updates, {
      new: true,
    });
    res.send(property);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete Property
app.delete("/property/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    await Property.findByIdAndDelete(id);
    res.send("Property deleted");
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get All Properties
app.get("/all-properties", async (req, res) => {
  const properties = await Property.find();
  res.send(properties);
});

app.listen(5000, () => {
  console.log("Server started on port 5000");
});
