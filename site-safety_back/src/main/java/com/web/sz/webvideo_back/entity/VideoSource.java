package com.web.sz.webvideo_back.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "video_source")
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VideoSource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String name;
    private String url;

    public VideoSource(String name, String url) {
        this.name = name;
        this.url = url;
    }
}
