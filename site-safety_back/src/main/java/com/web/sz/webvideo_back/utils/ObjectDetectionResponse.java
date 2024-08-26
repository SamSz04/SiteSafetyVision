package com.web.sz.webvideo_back.utils;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ObjectDetectionResponse {
    private String message;
    private List<String> images;  // 这是一个 Base64 编码图像的列表
}

