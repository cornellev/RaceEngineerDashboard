import { TextField } from "@mui/material";

export default function RaceGPT() {
  return (
    <div className="w-screen h-full flex items-center justify-center text-center text-sm flex-col text-gray-400">
      <h1 className="m-5">RaceGPT coming soon...</h1>
      <div className="w-1/3">
        <TextField
          id="filled-basic"
          label="Enter your prompt here..."
          variant="filled"
          fullWidth
          sx={{
            input: {
              color: "#eeeeee",
            },
            // Change label color
            "& .MuiInputLabel-root": {
              color: "#ccc", // Default label color
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "rgba(239, 68, 60, 0.9)", // Focused label color
            },

            // Change border color
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#cccccc", // Default border color
              },
              "&:hover fieldset": {
                borderColor: "#ffffff", // Hover border color
              },
              "&.Mui-focused fieldset": {
                borderColor: "#ffffff", // Focused border color
              },
            },
          }}
        />
      </div>
    </div>
  );
}
