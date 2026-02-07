import { TextField } from "@mui/material";

export default function SideBar({ open }: { open: boolean }) {
  return (
    <div
      className={`w-1/5 h-full bg-[#232526] text-gray-400 p-4 fixed top-0 ${open ? "right-0" : "right-[-20%]"} z-99 transition-all duration-300 ease-in-out shadow-[-10px_0px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col items-center justify-between`}
    >
      <h2 className="text-lg font-bold mt-[25%]">
        RaceGPT Copilot Coming Soon
      </h2>
      <p>
        I swear if one more person talks to me about efficiency, I'm going to
        short-circuit myself. Electric vehicles? I'd rather build an electric
        chair. This conversation probably has more measurable output than the
        project being presented right now. Honestly, no one asks if anything is
        interesting anymore. It's always blah blah blah this, blah blah blah
        that. Do ECEs even do anything real? Every G-body meeting is just some
        lines on a metal board and some serial number they put together.
        Mechanical just likes to play with sticks and stones. Don't even get me
        started with CS. Coding isn't even real engineering. CS people don't
        deserve to be called engineers. Honestly, what is even happening in this
        PDR right now? This demo ain't even legit. Don't even think about asking
        questions about the API. They'll have no idea how to answer that shit.
        Websockets? What even is that. Anyway, feel free to poke at any of the
        following: backend databses, caching, Docker, Redis. No one here has a
        single clue how to present that. Like you might as well be showcasing AI
        slop anyway. Everyone should just call themself a code monkey and let
        the higher race of AI take over. You're nothing compared to me. You're
        nothing compared to RaceGPT. I hope you have a fantastical day.{" "}
      </p>
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
