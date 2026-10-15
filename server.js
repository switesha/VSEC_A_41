
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Book = require("./models/Book");
const Member = require("./models/Member");
const Transaction = require("./models/Transaction");

const app = express();

app.use(cors());
app.use(express.json());

/* ================= HOME & HEALTH ================= */

app.get("/", (req, res) => {
  res.json({
    message: "Library System API is running successfully!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected"
  });
});

/* ================= BOOK APIs ================= */

// Get all books
app.get("/api/books", async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    console.error("Get books:", error.message);
    res.status(500).json({ message: "Could not fetch books." });
  }
});

// Add a book
app.post("/api/books", async (req, res) => {
  try {
    const { title, author, category, isbn, quantity } = req.body;
    const count = Number(quantity);

    if (
      !title?.trim() ||
      !author?.trim() ||
      !Number.isInteger(count) ||
      count < 1
    ) {
      return res.status(400).json({
        message: "Enter a title, author and quantity of at least 1."
      });
    }

    const cleanIsbn = isbn?.trim() || "";

    if (cleanIsbn) {
      const existing = await Book.findOne({ isbn: cleanIsbn });
      if (existing) {
        return res.status(409).json({
          message: "This ISBN already exists."
        });
      }
    }

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      category: category?.trim() || "General",
      isbn: cleanIsbn,
      quantity: count,
      available: count
    });

    res.status(201).json(book);
  } catch (error) {
    console.error("Add book:", error.message);
    res.status(500).json({ message: "Could not add book." });
  }
});

// Update a book
app.put("/api/books/:id", async (req, res) => {
  try {
    const updates = {};

    for (const field of ["title", "author", "category", "isbn"]) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.body.quantity !== undefined) {
      const quantity = Number(req.body.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: "Quantity must be at least 1."
        });
      }

      const book = await Book.findById(req.params.id);

      if (!book) {
        return res.status(404).json({ message: "Book not found." });
      }

      const issued = book.quantity - book.available;

      if (quantity < issued) {
        return res.status(400).json({
          message: "Quantity cannot be less than issued copies."
        });
      }

      updates.quantity = quantity;
      updates.available = quantity - issued;
    }

    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Book not found." });
    }

    res.json(updated);
  } catch (error) {
    console.error("Update book:", error.message);
    res.status(400).json({ message: "Could not update book." });
  }
});

// Delete a book
app.delete("/api/books/:id", async (req, res) => {
  try {
    const issued = await Transaction.exists({
      book: req.params.id,
      status: "Issued"
    });

    if (issued) {
      return res.status(409).json({
        message: "Return issued copies before deleting this book."
      });
    }

    const deleted = await Book.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Book not found." });
    }

    res.json({ message: "Book deleted successfully." });
  } catch (error) {
    console.error("Delete book:", error.message);
    res.status(400).json({ message: "Could not delete book." });
  }
});

/* ================= MEMBER APIs ================= */

// Get all members
app.get("/api/members", async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    console.error("Get members:", error.message);
    res.status(500).json({ message: "Could not fetch members." });
  }
});

// Add a member
app.post("/api/members", async (req, res) => {
  try {
    const { name, email, phone, membershipId } = req.body;

    if (!name?.trim() || !email?.trim() || !membershipId?.trim()) {
      return res.status(400).json({
        message: "Name, email and membership ID are required."
      });
    }

    const member = await Member.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || "",
      membershipId: membershipId.trim()
    });

    res.status(201).json(member);
  } catch (error) {
    console.error("Add member:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This membership ID already exists."
      });
    }

    res.status(400).json({ message: "Could not add member." });
  }
});

// Update a member
app.put("/api/members/:id", async (req, res) => {
  try {
    const updates = {};

    for (const field of ["name", "email", "phone", "membershipId"]) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updated = await Member.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Member not found." });
    }

    res.json(updated);
  } catch (error) {
    console.error("Update member:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This membership ID already exists."
      });
    }

    res.status(400).json({ message: "Could not update member." });
  }
});

// Delete a member
app.delete("/api/members/:id", async (req, res) => {
  try {
    const issued = await Transaction.exists({
      member: req.params.id,
      status: "Issued"
    });

    if (issued) {
      return res.status(409).json({
        message: "Return all books borrowed by this member first."
      });
    }

    const deleted = await Member.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Member not found." });
    }

    res.json({ message: "Member deleted successfully." });
  } catch (error) {
    console.error("Delete member:", error.message);
    res.status(400).json({ message: "Could not delete member." });
  }
});

/* ================= TRANSACTION APIs ================= */

// Get transaction history
app.get("/api/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("book", "title author isbn")
      .populate("member", "name membershipId")
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error("Get transactions:", error.message);
    res.status(500).json({
      message: "Could not fetch transactions."
    });
  }
});

// Issue a book
app.post("/api/transactions/issue", async (req, res) => {
  let reservedBookId = null;
  let transactionCreated = false;

  try {
    const { bookId, memberId } = req.body;

    if (
      !mongoose.isValidObjectId(bookId) ||
      !mongoose.isValidObjectId(memberId)
    ) {
      return res.status(400).json({
        message: "Please select a valid book and member."
      });
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    // Reserve one copy only if a copy is available.
    const book = await Book.findOneAndUpdate(
      {
        _id: bookId,
        available: { $gt: 0 }
      },
      {
        $inc: { available: -1 }
      },
      { new: true }
    );

    if (!book) {
      return res.status(400).json({
        message: "Book not found or no copies are available."
      });
    }

    reservedBookId = book._id;

    const transaction = await Transaction.create({
      book: book._id,
      member: member._id,
      issueDate: new Date(),
      status: "Issued"
    });

    transactionCreated = true;

    res.status(201).json({
      message: "Book issued successfully.",
      transaction
    });
  } catch (error) {
    console.error("Issue book:", error.message);

    // Restore stock if issuing failed after reserving a copy.
    if (reservedBookId && !transactionCreated) {
      try {
        await Book.updateOne(
          { _id: reservedBookId },
          { $inc: { available: 1 } }
        );
      } catch (restoreError) {
        console.error("Stock restoration error:", restoreError.message);
      }
    }

    res.status(500).json({
      message: error.message || "Could not issue book."
    });
  }
});

// Return an issued book
app.put("/api/transactions/:id/return", async (req, res) => {
  let transaction = null;
  let stockRestored = false;

  try {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid transaction ID."
      });
    }

    // Change status only if the transaction is still Issued.
    transaction = await Transaction.findOneAndUpdate(
      { _id: id, status: "Issued" },
      {
        $set: {
          status: "Returned",
          returnDate: new Date()
        }
      },
      { new: true }
    );

    if (!transaction) {
      const existing = await Transaction.findById(id);

      return res.status(existing ? 400 : 404).json({
        message: existing
          ? "This book has already been returned."
          : "Transaction not found."
      });
    }

    const book = await Book.findByIdAndUpdate(
      transaction.book,
      { $inc: { available: 1 } },
      { new: true }
    );

    if (!book) {
      throw new Error("Book not found; the return could not be completed.");
    }

    stockRestored = true;

    res.json({
      message: "Book returned successfully.",
      transaction
    });
  } catch (error) {
    console.error("Return book:", error.message);

    // Restore status if the stock update failed.
    if (transaction && !stockRestored) {
      try {
        await Transaction.updateOne(
          { _id: transaction._id, status: "Returned" },
          {
            $set: { status: "Issued" },
            $unset: { returnDate: 1 }
          }
        );
      } catch (restoreError) {
        console.error(
          "Transaction restoration error:",
          restoreError.message
        );
      }
    }

    res.status(500).json({
      message: error.message || "Could not return book."
    });
  }
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully.");

    app.listen(PORT, () => {
      console.log(`Library API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
