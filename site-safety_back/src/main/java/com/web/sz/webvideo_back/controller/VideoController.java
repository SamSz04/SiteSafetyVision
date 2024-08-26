package com.web.sz.webvideo_back.controller;

import com.web.sz.webvideo_back.entity.VideoSource;
import com.web.sz.webvideo_back.repository.VideoSourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api")
public class VideoController {
    @Autowired
    private VideoSourceRepository videoSourceRepository;

    @GetMapping("/video-sources/all")
    public List<VideoSource> getVideoSources() {
        return videoSourceRepository.findAll();
    }

    @PostMapping("/video-sources/add")
    public VideoSource addVideoSource(@RequestBody VideoSource videoSource) {
        return videoSourceRepository.save(videoSource);
    }

    @DeleteMapping("/video-sources/{id}")
    public void deleteVideoSource(@PathVariable int id) {
        videoSourceRepository.deleteById(id);
    }
}
