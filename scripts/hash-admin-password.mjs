import argon2 from "argon2";

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
  throw new Error("Run this command in an interactive terminal so the password is not echoed.");
}

process.stdout.write("Administrator password: ");
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

let password = "";
const onInput = async (character) => {
  if (character === "\u0003") {
    process.stdout.write("\nCancelled.\n");
    process.exit(1);
  }
  if (character === "\r" || character === "\n") {
    process.stdin.off("data", onInput);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
    if (password.length < 12) {
      process.stderr.write("Use a password with at least 12 characters.\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${await argon2.hash(password, { type: argon2.argon2id })}\n`);
    password = "";
    return;
  }
  if (character === "\u007f" || character === "\b") {
    password = password.slice(0, -1);
    return;
  }
  if (character >= " ") password += character;
};

process.stdin.on("data", onInput);
