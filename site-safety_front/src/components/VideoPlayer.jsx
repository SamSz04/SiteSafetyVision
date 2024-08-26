import React, { useState, useEffect } from "react";
import {
    Table, Button, Layout,
    Menu, message, Input,
    Form, Modal, Divider,
    Space, Image, Tabs,
    Timeline, Result, Badge
} from "antd";
import { ProCard } from '@ant-design/pro-components';
import axios from "axios";
import Player from "xgplayer";
import 'xgplayer/dist/index.min.css';

const { Header, Content } = Layout;
const { TabPane } = Tabs;


const VideoPlayer = () => {
    const [videoSources, setVideoSources] = useState([]);
    const [player, setPlayer] = useState(null);
    const [ws, setWs] = useState(null);
    const [currentVideoUrl, setCurrentVideoUrl] = useState("");
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [detectionResult, setDetectionResult] = useState([]);
    const [form] = Form.useForm();
    const [status, setStatus] = useState(0);

    useEffect(() => {
        // 获取视频源列表
        fetchVideoSources();
    }, []);

    useEffect(() => {
        // 清理播放器实例
        return () => {
            if (player) player.destroy();
        };
    }, [player]);

    const fetchVideoSources = async () => {
        try {
            const response = await axios.get("http://localhost:8080/api/video-sources/all");
            setVideoSources(response.data);
        } catch (error) {
            console.error("Error fetching video sources:", error);
            message.error("无法获取视频源");
        }
    };

    const handlePlayVideo = async (url) => {
        // 如果有现有的 WebSocket 连接，先将其关闭
        if (ws) {
            ws.close(); // 关闭现有的 WebSocket 连接
            setWs(null); // 清除 WebSocket 状态
        }

        setCurrentVideoUrl(url);
        if (player) player.destroy();

        const newPlayer = new Player({
            id: "xg-player",
            url: url,
            autoplay: true
        });
        setPlayer(newPlayer);

        // 清空之前的检测结果
        setDetectionResult([]);

        // 更新 status 为 1，表示正在分析
        setStatus(1);

        // 初始化 WebSocket 连接
        const websocket = new WebSocket('ws://localhost:5000/ws');
        setWs(websocket);

        // 监听 WebSocket 消息
        websocket.onmessage = (event) => {
            if (event.data === "视频处理完成！") {
                message.success("视频处理已完成！");
                setStatus(2);
                websocket.close();
            } else {
                const data = JSON.parse(event.data);
                const timestamp = data.timestamp;
                const image = data.image;

                setDetectionResult(prevResults => [...prevResults, { timestamp, image }]);
            }
        };

        // 发送视频 URL 以开始检测
        websocket.onopen = () => {
            websocket.send(url);
        };

        websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            message.error("WebSocket连接失败！");
            setStatus(0); // 在连接失败时，将 status 设回 0
        };

        websocket.onclose = () => {
            message.info("WebSocket连接已关闭！");
            console.log("结束后", detectionResult);
            if (status === 1) {
                setStatus(2); // 如果在分析过程中关闭，标记分析已完成
            }
        };
    };


    const handleAddVideoSource = async (values) => {
        try {
            const response = await axios.post("http://localhost:8080/api/video-sources/add", {
                name: values.name,
                url: values.url,
            });
            setVideoSources([...videoSources, response.data]);
            message.success("添加视频源成功");
            form.resetFields();
            setIsModalVisible(false);
        } catch (error) {
            console.error("Error adding video source:", error);
            message.error("无法添加视频源");
        }
    };

    const handleDeleteVideoSource = async (id) => {
        try {
            await axios.delete(`http://localhost:8080/api/video-sources/${id}`);
            setVideoSources(videoSources.filter(source => source.id !== id));
            message.success("删除视频源成功");
        } catch (error) {
            console.error("Error deleting video source:", error);
            message.error("无法删除视频源");
        }
    };

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const columns = [
        {
            title: "名称",
            dataIndex: "name",
            key: "name",
            align: "center"
        },
        {
            title: "视频源URL",
            dataIndex: "url",
            key: "url",
            align: "center",
            width: '30%'
        },
        {
            title: "操作",
            key: "action",
            align: "center",
            render:(_, record) => (
                <Space split={<Divider type="vertical" />}>
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => handlePlayVideo(record.url)}
                    >
                        播放
                    </Button>
                    <Button danger size="small" onClick={() => handleDeleteVideoSource(record.id)}>
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Layout style={{ height: '100vh'}}>
            <Header>
                <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["1"]}>
                    <Menu.Item key="1">首页</Menu.Item>
                    {/*<Menu.Item key="2">视频</Menu.Item>*/}
                    {/*<Menu.Item key="3">设置</Menu.Item>*/}
                </Menu>
            </Header>
            <Content style={{ display: "flex" }}>
                <ProCard split="vertical">
                    <ProCard
                        title={
                            <Button type="primary" onClick={showModal}>
                                新增视频源
                            </Button>
                        }
                        colSpan="50%"
                        headerBordered
                    >
                        <Table
                            bordered
                            pagination={false}
                            size="middle"
                            columns={columns}
                            dataSource={videoSources}
                            rowKey="id"
                        />
                        <Modal
                            title="新增视频源"
                            open={isModalVisible}
                            onCancel={handleCancel}
                            footer={null}
                        >
                            <Form form={form} onFinish={handleAddVideoSource}>
                                <Form.Item
                                    label="名称"
                                    name="name"
                                    rules={[{ required: true, message: "请输入视频源名称" }]}
                                >
                                    <Input />
                                </Form.Item>
                                <Form.Item
                                    label="URL"
                                    name="url"
                                    rules={[{ required: true, message: "请输入视频源 URL" }]}
                                >
                                    <Input />
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" htmlType="submit">
                                        提交
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Modal>
                    </ProCard>
                    <ProCard title="视频播放" headerBordered>
                        <div style={{
                            // flex: 1,
                            // display: "flex",
                            // justifyContent: "center",
                            // alignItems: "center",
                        }}>
                            <div id="xg-player" style={{width: "100%", height: "10%", margin: "0 auto"}}></div>
                        </div>
                        <div style={{width: "100%"}}>
                            <Tabs defaultActiveKey="1">
                                <TabPane tab="检测结果" key="1">
                                    {status === 0 ? (
                                        <Result
                                            status="info"
                                            title="可以点击“播放”按钮观看并分析视频"
                                        />
                                    ) : status === 1 ? (
                                        detectionResult.length === 0 ? (
                                            <Result
                                                status="info"
                                                title="分析中..."
                                            />
                                        ) : (
                                            <div>
                                                <Result
                                                    status="warning"
                                                    title="检测出有工人未佩戴安全帽！"
                                                    subTitle="请到“消息”栏查看检测到的异常帧"
                                                />
                                            </div>
                                        )
                                    ) : status === 2 && detectionResult.length === 0 ? (
                                        <Result
                                            status="success"
                                            title="暂未检测出异常！"
                                            subTitle="所有工人都已正确佩戴安全帽！"
                                        />
                                    ) : (
                                        <div>
                                            <Result
                                                status="error"
                                                title="检测出有工人未佩戴安全帽！"
                                                subTitle="请到“消息”栏查看检测到的异常帧"
                                            />
                                        </div>
                                    )}
                                </TabPane>

                                <TabPane
                                    tab={
                                        <Badge count={detectionResult.length} offset={[20, 0]}>
                                            <span>消息</span>
                                        </Badge>
                                    }
                                    key="2"
                                >
                                    <Timeline mode="left">
                                        {detectionResult.map((item, index) => (
                                            <Timeline.Item label={item.timestamp} key={index}>
                                                <Image src={`data:image/jpeg;base64,${item.image}`} alt="检测结果" style={{ width: "60%" }} />
                                            </Timeline.Item>
                                        ))}
                                    </Timeline>
                                </TabPane>
                            </Tabs>
                        </div>
                    </ProCard>
                </ProCard>
            </Content>
        </Layout>
    );
};

export default VideoPlayer;
