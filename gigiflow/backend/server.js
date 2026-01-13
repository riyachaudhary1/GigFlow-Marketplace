require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // Allow frontend

// --- DATABASE MODELS ---
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});
const User = mongoose.model('User', UserSchema);

const GigSchema = new mongoose.Schema({
    title: String,
    description: String,
    budget: Number,
    ownerId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: 'Open' } // Open or Assigned
});
const Gig = mongoose.model('Gig', GigSchema);

const BidSchema = new mongoose.Schema({
    gigId: mongoose.Schema.Types.ObjectId,
    freelancerId: mongoose.Schema.Types.ObjectId,
    email: String, // Storing email for easy display
    message: String,
    status: { type: String, default: 'Pending' } // Pending, Hired, Rejected
});
const Bid = mongoose.model('Bid', BidSchema);

// --- CONNECT TO DB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// --- ROUTES ---

// 1. REGISTER
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = await User.create({ name, email, password: hashedPassword });
        res.json(user);
    } catch (e) { res.status(400).json("Error creating user"); }
});

// 2. LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("User not found");
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json("Wrong password");

    const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET);
    // Send token in cookie (HttpOnly) as requested
    res.cookie('token', token, { httpOnly: true }).json({ id: user._id, name: user.name });
});

// Middleware to check login
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json("Not Authenticated");
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json("Token invalid");
        req.user = user;
        next();
    });
};

// 3. POST A GIG
app.post('/api/gigs', verifyToken, async (req, res) => {
    const gig = await Gig.create({ ...req.body, ownerId: req.user.id });
    res.json(gig);
});

// 4. GET ALL GIGS
app.get('/api/gigs', async (req, res) => {
    const gigs = await Gig.find({ status: 'Open' }); // Only show open jobs
    res.json(gigs);
});

// 5. BID ON A GIG
app.post('/api/bids', verifyToken, async (req, res) => {
    const bid = await Bid.create({ ...req.body, freelancerId: req.user.id, email: req.user.name });
    res.json(bid);
});

// 6. GET BIDS FOR A GIG (For the owner)
app.get('/api/bids/:gigId', verifyToken, async (req, res) => {
    const bids = await Bid.find({ gigId: req.params.gigId });
    res.json(bids);
});

// 7. HIRING LOGIC (The Main Requirement)
app.put('/api/bids/hire/:bidId', verifyToken, async (req, res) => {
    const bid = await Bid.findById(req.params.bidId);
    if (!bid) return res.status(404).json("Bid not found");

    // 1. Mark this bid as Hired
    bid.status = 'Hired';
    await bid.save();

    // 2. Mark Gig as Assigned
    await Gig.findByIdAndUpdate(bid.gigId, { status: 'Assigned' });

    // 3. Reject all other bids for this Gig
    await Bid.updateMany(
        { gigId: bid.gigId, _id: { $ne: bid._id } },
        { status: 'Rejected' }
    );

    res.json({ message: "Freelancer Hired Successfully!" });
});

app.listen(5000, () => console.log("Server running on port 5000"));