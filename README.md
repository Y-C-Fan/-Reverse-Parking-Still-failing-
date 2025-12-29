# 🚗 Parking Master (老司机倒车指南)

<div align="center">

![License](https://img.shields.io/badge/license-MIT-yellow.svg)
![React](https://img.shields.io/badge/React-19-blue)
![Powered by Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)

**An interactive parking simulator powered by Physics Engine & Google Gemini AI.**

[English](#-english) | [中文](#-中文说明)

</div>

---

<a name="-english"></a>
## 🇬🇧 English

### 📖 Introduction

**Parking Master** is designed for novice drivers who struggle with spatial awareness during reverse parking.

It provides a seamless transition between **2D (Top-down)** and **3D (Follow-cam)** views, visualizes predictive trajectories based on Ackerman steering geometry, and simulates realistic vehicle physics. Additionally, it integrates an **AI Instructor** powered by **Google Gemini**, offering real-time, human-like advice based on your car's telemetry.

### ✨ Key Features

*   **🕹️ Realistic Controls**:
    *   **Gearbox**: Real P (Park), R (Reverse), N (Neutral), D (Drive) logic.
    *   **Dual Pedals**: Separate Accelerator and Brake pedals with inertia simulation.
    *   **Steering**: Interactive steering wheel with turn indicators and auto-centering.
*   **👀 Dual Perspectives**:
    *   **2D View**: For overall spatial awareness.
    *   **3D View**: Simulates the driver's perspective or a follow-cam for depth perception.
*   **📐 Physics & Trajectory**:
    *   Real-time trajectory prediction (Blue for Drive, Yellow for Reverse).
    *   Collision detection and accurate turning radius simulation.
*   **🤖 AI Instructor**:
    *   Powered by Google Gemini 3 Flash.
    *   Analyzes position, angle, and distance to give instant feedback.
    *   **Bring Your Own Key**: Securely input your own Gemini API Key in the settings (stored locally).

### 🛠️ Tech Stack

*   **Framework**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **AI**: Google GenAI SDK (Gemini 3 Flash)
*   **Build Tool**: Vite

### 🚀 Quick Start

1.  **Clone the repo**
    ```bash
    git clone https://github.com/your-username/parking-master.git
    cd parking-master
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run**
    ```bash
    npm run dev
    ```

4.  **Configure API Key**
    Open the app in your browser, click the **Settings** icon in the top right, and enter your free Google Gemini API Key.

### 📱 Mobile Experience
This app is optimized for mobile browsers (iOS/Android). For the best experience, use the **"Add to Home Screen"** feature in Safari or Chrome to run it in full-screen mode.

---

<a name="-中文说明"></a>
## 🇨🇳 中文说明

### 📖 项目简介

**老司机倒车指南** 专为新手司机设计。很多新手在倒车时容易失去方向感，不知道方向盘该打多少，也不清楚车尾会怎么摆动。

本项目通过 2D/3D 视角的无缝切换、可视化的轨迹预测以及真实的车辆物理模型，让你在浏览器中就能直观地理解倒车原理。更有基于 **Google Gemini** 模型的 AI 教练，实时根据你的车辆姿态提供“人话”指导。

### ✨ 核心功能

*   **🕹️ 真实驾驶操作**：
    *   **档位系统**：P (驻车)、R (倒车)、N (空挡)、D (前进) 真实逻辑。
    *   **双踏板控制**：独立的油门与刹车踏板，模拟真实加减速与惯性滑行。
    *   **方向盘模拟**：带有回正标识和圈数显示的交互式方向盘。
*   **👀 双视角切换**：
    *   **2D 上帝视角**：宏观把控车辆位置与周边环境。
    *   **3D 智能跟随**：模拟类似赛车游戏的后视镜头，增强空间感。
*   **📐 硬核物理模拟**：
    *   基于阿克曼转向几何 (Ackerman steering geometry) 的运动学模型。
    *   模拟车辆惯性、摩擦力及碰撞检测。
    *   **智能轨迹线**：根据当前档位和方向盘角度，实时预测车辆行驶轨迹（蓝色为前进，黄色为后退）。
*   **🤖 AI 老司机陪练**：
    *   集成 Google Gemini 3 Flash 模型。
    *   AI 会根据车辆遥测数据（位置、角度、距离）实时分析。
    *   **自定义 Key**：在网页设置中填入你的 API Key 即可使用 AI 功能（Key 仅保存在本地）。

### 🚀 快速开始

1.  **克隆项目**
    ```bash
    git clone https://github.com/your-username/parking-master.git
    cd parking-master
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **运行项目**
    ```bash
    npm run dev
    ```

4.  **配置 API Key**
    打开网页后，点击右上角的 **设置** 图标，填入你的 Google Gemini API Key 即可激活 AI 教练。
    > 💡 你可以从 [Google AI Studio](https://aistudio.google.com/) 免费获取 API Key。

### 📱 手机端体验优化
本项目针对 Vercel 部署和移动端访问进行了深度优化。
在 iOS Safari 或 Android Chrome 中，推荐使用浏览器的 **“添加到主屏幕” (Add to Home Screen)** 功能。这样可以隐藏浏览器地址栏，获得类似原生 App 的全屏沉浸式体验。

## 📄 License

MIT License
