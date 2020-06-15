package main

import (
	"context"
	"flag"
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	"github.com/donbattery/wshub"
)

var (
	addr      = flag.String("addr", "localhost:8080", "http service address")
	upgrader  = websocket.Upgrader{} // use default options
	controlCh = make(chan *wshub.ControlNotify)
	wsHUB     = wshub.NewWsHub(context.Background(), controlCh)
)

func hub(w http.ResponseWriter, r *http.Request) {
	keys, ok := r.URL.Query()["client_id"]
	if !ok || keys[0] == "" {
		log.Println("Url Param 'client_id' is missing")
		return
	}
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	wsHUB.Connect(keys[0], c)
}

func home(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "index.html")
}

func ws(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "ws.js")
}

func main() {
	flag.Parse()
	log.SetFlags(0)
	wsHUB.Start()
	http.HandleFunc("/", home)
	http.HandleFunc("/ws.js", ws)
	http.HandleFunc("/hub", hub)
	log.Fatal(http.ListenAndServe(*addr, nil))
}
