from ultralytics import YOLO
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import cv2
import base64
import json

# 导入is_similar函数
from utils import is_similar

app = FastAPI()

# 允许来自所有来源的 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 加载训练好的模型
model = YOLO('best.pt').to('cuda')

# class names
# names: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
# Hardhat - 安全帽
# Mask - 口罩
# NO-Hardhat - 无安全帽
# NO-Mask - 无口罩
# NO-Safety Vest - 无安全背心
# Person - 人
# Safety Cone - 安全锥
# Safety Vest - 安全背心
# machinery - 机械（挖掘机）
# vehicle - 车辆
# names: [Hardhat, Mask, NO-Hardhat, NO-Mask, NO-Safety Vest, Person, Safety Cone, Safety Vest, machinery, vehicle]


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            video_url = await websocket.receive_text()
            print(video_url)
            cap = cv2.VideoCapture(video_url)

            if not cap.isOpened():
                await websocket.send_text("错误: 无法打开视频！")
                break

            frame_count = 0
            prev_boxes = None  # 上一帧的检测框，用于去重
            prev_frame = None  # 上一帧的画面
            fps = cap.get(cv2.CAP_PROP_FPS)  # 获取视频的帧率
            process_every_nth_frame = int(fps // 2)  # 每秒处理大约两次
            confidence_threshold = 0.45  # 置信度阈值

            while True:
                ret, frame = cap.read()
                if not ret:
                    break  # 当视频结束时退出循环

                # 只处理每第N帧
                if frame_count % process_every_nth_frame == 0:
                    # 检测人和未佩戴头盔的类别（未佩戴头盔的类别ID为2，人的类别ID为5）
                    results = model.predict(frame, save=False, classes=[2, 5], line_width=5)

                    current_boxes = [result.xyxy for result in results[0].boxes]

                    # 判断是否有未佩戴头盔的检测结果，并且检测框中包含人
                    has_no_helmet = any(
                        result.cls == 2 and result.conf >= confidence_threshold for result in results[0].boxes
                    )
                    has_person = any(result.cls == 5 for result in results[0].boxes)  # 判断是否有人

                    # 使用is_similar函数判断是否保存当前帧
                    if has_no_helmet and has_person and not is_similar(frame, prev_frame, current_boxes, prev_boxes):
                        # 只保留未佩戴头盔的检测框，移除人的检测框
                        results[0].boxes = [box for box in results[0].boxes if box.cls == 2]

                        # 计算未佩戴头盔的人数
                        no_helmet_count = len(results[0].boxes)

                        # 在图像上绘制检测框
                        annotated_frame = results[0].plot()

                        # 将绘制了检测框的图像编码为Base64
                        _, buffer = cv2.imencode('.jpg', annotated_frame)
                        encoded_frame = base64.b64encode(buffer).decode()

                        # 计算当前帧的时间戳
                        current_time = frame_count / fps

                        # 发送时间戳和图像数据
                        data = {
                            "timestamp": f"{int(current_time // 60):02d}:{int(current_time % 60):02d}",
                            "image": encoded_frame,
                            "no_helmet_count": no_helmet_count
                        }
                        await websocket.send_text(json.dumps(data))

                        # 保存当前帧，用于下次检验
                        prev_boxes = current_boxes
                        prev_frame = frame

                frame_count += 1

            cap.release()

            await websocket.send_text("视频处理完成！")

    except WebSocketDisconnect:
        print("WebSocket 连接断开！")
