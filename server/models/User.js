const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    favorites: [
      {
        ticker: {
          type: String,
          required: true,
          uppercase: true,
        },
        name: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to add favorite stock
userSchema.methods.addFavorite = function (ticker, name) {
  const existingFavorite = this.favorites.find((fav) => fav.ticker === ticker);
  if (!existingFavorite) {
    this.favorites.push({ ticker, name });
    return true;
  }
  return false;
};

// Method to remove favorite stock
userSchema.methods.removeFavorite = function (ticker) {
  const initialLength = this.favorites.length;
  this.favorites = this.favorites.filter((fav) => fav.ticker !== ticker);
  return this.favorites.length < initialLength;
};

module.exports = mongoose.model("User", userSchema);
