import React, { useState, useEffect, useRef } from "react";
import { Table, Button, Layout, Menu, message, Input, Form, Modal, Divider, Space, Image, Tabs, Timeline, Result, Badge } from "antd";
import { ProCard } from '@ant-design/pro-components';
import axios from "axios";
import Player from "xgplayer";
import 'xgplayer/dist/index.min.css';

const { Header, Content } = Layout;
const { TabPane } = Tabs;

const NewVideoPlayer = () => {
    const [videoSources, setVideoSources] = useState([]);
    const playerRef = useRef(null); // 用于保存Player实例的引用
    const [ws, setWs] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [detectionResult, setDetectionResult] = useState([]);
    const detectionResultRef = useRef(detectionResult);
    const [form] = Form.useForm();
    const [status, setStatus] = useState(0);
    const [panes, setPanes] = useState([]);
    const [activeKey, setActiveKey] = useState("1");

    useEffect(() => {
        fetchVideoSources();
    }, []);

    useEffect(() => {
        detectionResultRef.current = detectionResult;
    }, [detectionResult]);

    useEffect(() => {
        return () => {
            if (playerRef.current) playerRef.current.destroy();
        };
    }, []);

    const fetchVideoSources = async () => {
        try {
            const response = await axios.get("http://localhost:8080/api/video-sources/all");
            setVideoSources(response.data);
        } catch (error) {
            console.error("Error fetching video sources:", error);
            message.error("无法获取视频源");
        }
    };

    const handlePlayVideo = async (name, url) => {
        if (ws) {
            ws.close();
            setWs(null);
        }

        if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
        }

        setDetectionResult([]);
        setStatus(1);

        const websocket = new WebSocket('ws://localhost:5000/ws');
        setWs(websocket);

        websocket.onmessage = (event) => {
            if (event.data === "视频处理完成！") {
                message.success("视频处理已完成！");
                setStatus(2);
                websocket.close();
            } else {
                const data = JSON.parse(event.data);
                const timestamp = data.timestamp;
                const image = data.image;
                const no_helmet_count = data.no_helmet_count;
                setDetectionResult(prevResults => [...prevResults, { timestamp, image, no_helmet_count }]);
            }
        };

        websocket.onopen = () => {
            websocket.send(url);
        };

        websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            message.error("WebSocket连接失败！");
            setStatus(0);
        };

        websocket.onclose = () => {
            message.info("WebSocket连接已关闭！");
            if (status === 1) {
                setStatus(2);
            }
        };

        const newActiveKey = `tab-${Date.now()}`;
        setPanes((prevPanes) => [
            ...prevPanes,
            {
                title: `播放视频: ${name}`,
                key: newActiveKey,
                name,
                url
            }
        ]);
        setActiveKey(newActiveKey);

        setTimeout(() => {
            playerRef.current = new Player({
                id: "xg-player",
                url: url,
                autoplay: true
            });
        }, 100); // 添加一些延时，确保 DOM 已经渲染
    };

    const renderVideoAnalysis = () => (
        <div style={{ width: "100%" }}>
            <Tabs defaultActiveKey="1">
                <TabPane tab="检测结果" key="1">
                    {status === 0 ? (
                        <Result status="info" title="可以点击“播放”按钮观看并分析视频"/>
                    ) : status === 1 ? (
                        detectionResult.length === 0 ? (
                            <Result status="info" title="分析中..."/>
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
                    tab={<Badge count={detectionResult.length} offset={[20, 0]}><span>消息</span></Badge>}
                    key="2"
                >
                    <div style={{  marginTop: 15, maxHeight: '400px', overflowY: 'auto' }}>
                        <Timeline mode="left">
                            {detectionResult.map((item, index) => (
                                <Timeline.Item
                                    label={
                                        <div>
                                            <div>{item.timestamp}</div>
                                            <div>
                                                检测到疑似有
                                                <span style={{ color: 'red', fontSize: '16px', fontWeight: 'bold' }}>
                                                    {item.no_helmet_count}
                                                </span>
                                                人未戴头盔
                                            </div>
                                        </div>
                                    }
                                    key={index}
                                    onClick={() => handleSeekTo(item.timestamp)}
                                >
                                    <Image src={`data:image/jpeg;base64,${item.image}`} alt="检测结果"
                                           style={{ width: 400 }}/>
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    </div>
                </TabPane>
            </Tabs>
        </div>
    );

    const handleSeekTo = (timestamp) => {
        // timestamp 格式为 "mm:ss"
        const [minutes, seconds] = timestamp.split(":").map(Number);
        const timeInSeconds = (minutes * 60) + seconds;

        console.log("秒数是", timeInSeconds);

        if (playerRef.current) {
            playerRef.current.currentTime = timeInSeconds; // 跳转到指定时间
            // playerRef.current.play(); // 确保跳转后视频继续播放
            playerRef.current.pause();
        }
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
        },
        {
            title: "操作",
            key: "action",
            align: "center",
            render: (_, record) => (
                <Space split={<Divider type="vertical"/>}>
                    <Button type="primary" size="small" onClick={() => handlePlayVideo(record.name, record.url)}>
                        播放
                    </Button>
                    <Button danger size="small" onClick={() => handleDeleteVideoSource(record.id)}>
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    const handleDeleteTab = (targetKey) => {
        if (activeKey === targetKey) {
            if (ws) {
                ws.close();
                message.info("WebSocket连接已关闭！");
                setWs(null);
            }
        }

        const newPanes = panes.filter(pane => pane.key !== targetKey);
        setPanes(newPanes);

        if (newPanes.length > 0) {
            setActiveKey(newPanes[0].key);
        } else {
            setActiveKey("1");
        }
    };

    return (
        <Layout style={{height: '100vh'}}>
            <Header>
                <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["1"]}>
                    <Menu.Item key="1">首页</Menu.Item>
                </Menu>
            </Header>
            <Content>
                <Tabs
                    type="editable-card"
                    activeKey={activeKey}
                    onChange={(key) => setActiveKey(key)}
                    onEdit={(targetKey, action) => {
                        if (action === 'remove') {
                            handleDeleteTab(targetKey);
                        }
                    }}
                >
                    <TabPane tab="数据中心" key="1" closable={false}>
                        <ProCard
                            title={
                                <Button type="primary" onClick={() => setIsModalVisible(true)}>
                                    新增视频源
                                </Button>
                            }
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
                    </TabPane>
                    {panes.map((pane) => (
                        <TabPane tab={pane.title} key={pane.key} closable={true}>
                            <div>
                                <ProCard split="vertical">
                                    <ProCard title="视频播放" colSpan="40%">
                                        <div id="xg-player" style={{ width: "100%", height: "10%", margin: "0 auto" }}></div>
                                    </ProCard>
                                    <ProCard title="视频分析">
                                        {renderVideoAnalysis()}
                                    </ProCard>
                                </ProCard>
                            </div>
                        </TabPane>
                    ))}
                </Tabs>
            </Content>
        </Layout>
    );
};

export default NewVideoPlayer;
