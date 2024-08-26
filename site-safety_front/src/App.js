// src/App.js
import React from "react";
import VideoPlayer from "./components/VideoPlayer";
import NewVideoPlayer from "./components/NewVideoPlayer"; // 根据实际路径调整

const App = () => {
  return (
      <div className="App">
        {/*<VideoPlayer />*/}
          <NewVideoPlayer/>
      </div>
  );
};

export default App;

