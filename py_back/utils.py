# utils.py

import cv2
from skimage.metrics import structural_similarity as ssim


def is_similar(frame1, frame2, current_boxes, prev_boxes, iou_threshold=0.6, ssim_threshold=0.65):
    print("进入相似性检验！")
    # 首先检查输入帧是否为空
    if frame1 is None or frame2 is None:
        print("有画面缺失！")
        return False

    # 先计算SSIM ( Structural Similarity Index Measure )
    grayA = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    grayB = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    score, _ = ssim(grayA, grayB, full=True)

    print("----------------")
    print(score)

    if score >= ssim_threshold:
        print("初始画面太相似！")
        return True

    # 计算IoU（两个边界框的重合程度）
    def calculate_iou(boxA, boxB):
        # 解包张量的坐标
        xA, yA, xB, yB = (
            max(boxA[0].item(), boxB[0].item()),
            max(boxA[1].item(), boxB[1].item()),
            min(boxA[2].item(), boxB[2].item()),
            min(boxA[3].item(), boxB[3].item())
        )

        interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)

        boxAArea = (boxA[2].item() - boxA[0].item() + 1) * (boxA[3].item() - boxA[1].item() + 1)
        boxBArea = (boxB[2].item() - boxB[0].item() + 1) * (boxB[3].item() - boxB[1].item() + 1)

        iou = interArea / float(boxAArea + boxBArea - interArea)
        return iou

    # 如果两帧的检测框都存在，计算它们的IoU
    if prev_boxes and current_boxes:
        for cb, pb in zip(current_boxes, prev_boxes):
            if calculate_iou(cb[0], pb[0]) >= iou_threshold:
                print("框重合度过高！")
                return True

    return False
