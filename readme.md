# 🛠️ EZ Mocker ~ HTTP request interceptor

A lightweight, no-dependency Chrome extension that intercepts both `fetch` and `XMLHttpRequest` calls. It enables you to **mock API responses** with custom status codes, headers, delays, and full JSON bodies while your original request still reaches its destination.

> 🚀 Weighs only 100KB and uses chromium-based APIs.

---

## 📸 How it looks and feels?

Ez and sexy. 3 main buttons, 2 sections:

### 🎯 Create Custom Rules Easily

![Create Rule](./images/ez-mocker-readme-2.png)

### 📋 View, Edit, Enable/Disable Your Rules

![Rule List](./images/ez-mocker-readme-1.png)

---

## ⚙️ Key Features

- ✅ Intercepts **`fetch`** and **`XMLHttpRequest`**
- 🧪 Mock:
  - **JSON response body**
  - **Status codes**
  - **Response headers**
  - **Delay (in milliseconds)** (Only available with fetch, sorry, shit's hard enough)

- 🔍 Powerful URL filtering:
  - `INCLUDES`, `STARTS WITH`, `ENDS WITH`, `EXACT MATCH` or `REGEX`

- 🧭 Match by:
  - **HTTP method**
  - **Status code**
  - **Alias**

- 💀 Easily import and export your rules as JSON, all at once or one collection at a time
- 🧩 Built without any library dependencies, just loads of caffeine
- ⚡ Ultra lightweight — just **100KB**
- 🧠 FREE! Your limit is chrome storage and the power of will, I'm not even sure what's the actual limit
---

## 🧑‍💻 Use Case Examples

- Simulate backend responses during frontend development
- Test how your app handles failed requests (e.g., 500, 404)
- Quickly switch between different mock scenarios

---

## 🛠️ Installation

1. Download or clone this repository.
2. Go to `chrome://extensions/` in your browser.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the extension folder.
5. Why isn't this in the store? Not gonna pay a cent.

---

## 🧾 License

MIT License. Free to use and modify. Limit interceptors to 5-12 request as i've seen across multiple extensions should be considered a crime so I built this out of spite. Take care y'all, until AGI replace us.

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=webdev_slara&button_colour=FFDD00&font_colour=000000&font_family=Lato&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/webdev_slara)