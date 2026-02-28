import { TextField } from "@mui/material";

export default function SideBar({ open }: { open: boolean }) {
  return (
    <div
      className={`w-1/5 h-full bg-[#232526] text-gray-400 p-4 fixed top-0 ${open ? "right-0" : "right-[-20%]"} z-99 transition-all duration-300 ease-in-out shadow-[-10px_0px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col items-center justify-between`}
    >
      <h2 className="text-lg font-bold mt-[25%]">
        RaceGPT Copilot Coming Soon
      </h2>
      <p>Nothing to see here.</p>
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
  );
}
