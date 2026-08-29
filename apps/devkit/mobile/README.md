# DevKit Mobile

The Expo application is a native client for the same DevKit API used by web and desktop. It owns
its mobile navigation, conversation layout, secure session storage, keyboard behavior, and iOS or
Android presentation. It does not embed the web application in a WebView.

Set `EXPO_PUBLIC_COWORKER_API_URL` to the reachable central API origin. A physical iPhone must use
the development machine's LAN address or a deployed HTTPS address; `127.0.0.1` refers to the phone.
Projects, chat history, messages, and streamed replies remain central. Device credentials stay in
Expo SecureStore.
