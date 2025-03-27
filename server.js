const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:3000',
    'https://yokoshimadness.github.io'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/finance', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

const expenseSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    description: { type: String },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

const Expense = mongoose.model('Expense', expenseSchema);

app.get('/', (req, res) => {
    res.send('Welcome to the backend API!');
});

app.post('/api/expenses', async (req, res) => {
    const { amount, description, category, date } = req.body;
    const expense = new Expense({
        amount,
        description,
        category,
        date: date ? new Date(date) : new Date()
    });

    try {
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ message: 'Error saving expense', error: err.message });
    }
});

app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.status(200).json(expenses);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching expenses', error: err.message });
    }
});

app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { amount, description, category, date } = req.body;

    try {
        const expense = await Expense.findByIdAndUpdate(
            id,
            { amount, description, category, date: date ? new Date(date) : undefined },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        res.status(200).json(expense);
    } catch (err) {
        res.status(500).json({ message: 'Error updating expense', error: err.message });
    }
});

app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const expense = await Expense.findByIdAndDelete(id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting expense', error: err.message });
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const totalExpenses = await Expense.aggregate([
            { $group: { _id: "$category", total: { $sum: "$amount" } } }
        ]);

        const formattedExpenses = totalExpenses.map(item => ({
            name: item._id,
            value: item.total
        }));

        res.status(200).json(formattedExpenses);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching analytics', error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
