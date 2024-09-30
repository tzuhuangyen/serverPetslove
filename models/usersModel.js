//usersModel此檔案用來設定當用戶輸入時的規則
const mongoose = require('mongoose');
//先設定Schema規則
const userSchema = new mongoose.Schema(
  {
    photo: String,
    username: {
      type: String,
      required: [true, 'enter email'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'enter password'],
      minlength: 5,
      select: false,
      //預設會顯示密碼 改為false及會隱藏
    },
    resetPasswordToken: {
      type: String,
      select: false, // Optionally, make the reset token not selected by default as well
    },
    resetPasswordExpires: {
      type: Date,
      select: false, // Optionally, make the expiration not selected by default as well
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
    },
    // createdAt: {
    //   type: Date,
    //   default: Date.now,
    // },
    //select: false,前台不會顯示
  },
  {
    versionKey: false,
    timestamps: true, // 加上timestamps 會自動加上createdAt跟updatedAt
  }
);
//可以在options地方 versionKey可以選擇隱藏版本號
//可以在options地方加上客製collection名稱

// 將寫好的 userSchema 模型export出去
module.exports = mongoose.model('User', userSchema);
//第一個參數是'User 是collection名稱 第二個參數userSchema是schema的設置
//collection會自動改成小寫並會加上s
