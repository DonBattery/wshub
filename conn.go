package wshub

import "github.com/gorilla/websocket"

type conn struct {
	c *websocket.Conn
}
