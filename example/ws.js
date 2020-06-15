"use strict";

const ClientID = Math.random().toString(36).substring(2) + (new Date()).getTime().toString(36);

// getWSUR is a helper function to get the WebSocket Hub's URL
function getWSURL(endpoint) {
  endpoint = endpoint || "hub";
  let loc = window.location;
  let uri = "ws";
  if (loc.protocol === "https") {
    uri = "wss";
  }
  return `${uri}://${loc.host}${loc.pathname}${endpoint}?client_id=${ClientID}`;
};

// ChatNotify is sent to the server when the user creates a chat message
class ChatNotify {
  constructor(channel, message) {
    this.channel = channel;
    this.message = message;
  };
};

// ControlNotify is sent to the server when the user initiates a control command
class ControlNotify {
  constructor(controlType, controlKey) {
    this.control_type = controlType;
    this.control_key = controlKey;
  };
};

// ClientNotify is a message sent to the server without the need of a direct response
class ClientNotify {
  constructor(notifyType, opts){
    opts = opts || {};
    this.notify_type = notifyType;
    if (opts.hasOwnProperty("chat")) {
      this.chat = opts.chat;
    };
    if (opts.hasOwnProperty("control")) {
      this.control = opts.control;
    };
  };
};

// ClientRequest is the kind of ClientMsg that requires a direct response from the server
class ClientRequest {
  constructor(requestId, requestType, requestBody) {
    this.request_id = requestId;
    this.request_type = requestType;
    this.request_body = requestBody;
  };
};

// ClientMsg is the actual object that will be sent to the server on the WebSocket
class ClientMsg {
  constructor(msgType, opts) {
    opts = opts || {};
    this.msg_type = msgType;
    if (opts.hasOwnProperty("request")) {
      this.request = opts.request;
    };
    if (opts.hasOwnProperty("notify")) {
      this.notify = opts.notify;
    };
  };
};

// ChatMessage creates a chat type ClientMsg
function ChatMessage(channel, message) {
  return new ClientMsg("notify", {
    notify: new ClientNotify("chat", {
      chat: new ChatNotify(channel, message),
    }),
  });
};

// ControlMessage creates a control type ClientMsg
function ControlMessage(controlType, controlKey) {
  return new ClientMsg("notify", {
    notify: new ClientNotify("control", {
      control: new ControlNotify(controlType, controlKey),
    }),
  });
};

// RequestMessage creates a request type ClientMsg
function RequestMessage(requestId, requestType, requestBody) {
  return new ClientMsg("request", {
    request: new ClientRequest(requestId, requestType, requestBody),
  });
};

// WebSocketManager is the object responsible for WebSocket communication
class WebSocketManager {
  constructor(debug){
    this.debug = debug;
    this.ws = null;
    this.responseListeners = {};

    // ready returns true if the WebSocket is ready for communication
    this.ready          = () => this.ws && this.ws.readyState == WebSocket.OPEN;
    // randomId generates random ID for requests. This can be overriden with any other unique ID generator
    this.randomId       = (length) => Math.random().toString(36).substr(2, length);
    // onUpdateFn needs to be overriden with the GameWorld's onUpdate method
    this.onUpdateFn = update => { console.log(update); };

    this.init           = this.init.bind(this);
    this.notify         = this.notify.bind(this);
    this.request        = this.request.bind(this);
    this.msgHandler     = this.msgHandler.bind(this);
    this.handleChat     = this.handleChat.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
  };

  init() {
    // Get the WebSocket Hub's URL
    let uri = getWSURL();
    console.log(`Initiating WebSocket connection with URL: ${uri}`);
    // Return if already connected
    if (this.ws && this.ws.readyState == 1) {
      console.log("Websocket is already connected")
      return
    }
    // Try to connect
    try {
      this.ws = new WebSocket(uri);
    } catch (exception) {
      console.error("Failed to create WebSocket object", exception)
      return
    }

     /////////////////////////////////////
    // Set up the WebSocket Connection //
   /////////////////////////////////////

    this.ws.onopen = () => {
      // TODO: Implement recconnect
      console.log("WebSocket Connected with ID", ClientID);
    };

    this.ws.onerror = event => {
      // TODO: Implement proper error handling
      console.error("Connection error:", event);
    };

    this.ws.onmessage = event => {
      var parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch (exception) {
        console.error("Failed to JSON parse incoming Server Message", exception);
        return
      };
      this.msgHandler(parsed);
    };
  };

  msgHandler(msg) {
    if (!msg.hasOwnProperty("msg_type")) {
      console.error("Server Message has no type!")
      return
    };
    if (msg.msg_type == "chat") {
      this.handleChat(msg.chat);
      return
    };
    if (msg.msg_type == "update") {
      this.onUpdateFn(msg.world_update);
      return
    };
    if (msg.msg_type == "response") {
      this.handleResponse(msg.response);
      return
    };
    console.error("Server Message has unknown type:", msg.msg_type)
  };

  notify(msg) {
    if (!this.ready()) {
      console.error("WebSocketManager.notify called, but ws is not ready!");
      return
    };
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (exception) {
      console.error("Failed to send WebSocket notification message", exception);
    };
  };

  request(requestType, requestBody, onResponse) {
    if (!this.ready()) {
      console.error("WebSocketManager.request called, but ws is not ready!");
      return
    };
    // get a random request ID
    let requestId = randomId();
    // try to send the request
    try {
      this.ws.send(JSON.stringify(new RequestMessage(requestId, requestType, requestBody)));
    } catch (exception) {
      console.error("Failed to send WebSocket notification message", exception);
      return
    };
    // if suceeded, register the response listener
    this.responseListeners[requestId] = onResponse;
  };

  handleChat(chat) {
    console.log(`CHAT Channel: ${chat.channel} User: ${chat.username} Message: ${chat.message}`);
  };

  // handleResponse calls the registered onResponse function of a previous request
  handleResponse(response) {
    let reqId = response.request_id;
    if (this.responseListeners.hasOwnProperty(reqId)) { // if there is a registered response listener
      this.responseListeners[reqId](response); // call the function
      delete this.responseListeners[reqId]; // then delete the listener
    };
  };

};
