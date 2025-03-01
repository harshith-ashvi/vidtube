import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;

  if (
    [username, email, fullName, password].some((key) =>
      [undefined, ""].includes(key)
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const exitingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (exitingUser) {
    throw new ApiError(400, "User already exists with this username or email");
  }

  const avatarFilePath = req.files?.avatar?.[0]?.path;
  const coverImageFilePath = req.files?.coverImage?.[0].path;

  if (!avatarFilePath) {
    throw new ApiError(400, "Avatar is required");
  }

  let avatar = "";
  try {
    avatar = await uploadOnCloudinary(avatarFilePath);
  } catch (error) {
    throw new ApiError(400, "Failed to upload avatar");
  }

  let coverImage = "";
  try {
    coverImage = await uploadOnCloudinary(coverImageFilePath);
  } catch (error) {
    throw new ApiError(400, "Failed to upload cover image");
  }

  try {
    const user = await User.create({
      username: username.toLowerCase(),
      email,
      fullName,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering user");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered Successfully"));
  } catch (error) {
    console.log("Failed to create user", error);
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }

    throw new ApiError(
      500,
      "Something went wrong while creating user and files removed"
    );
  }
});

export { registerUser };
