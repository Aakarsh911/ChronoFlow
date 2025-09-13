package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" { port = "8080" }

	mux := http.NewServeMux()
	mux.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request){ w.WriteHeader(200) })
	mux.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request){ w.WriteHeader(200) })

	srv := &http.Server{
		Addr:         ":"+port,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	log.Printf("listening on :%s", port)
	log.Fatal(srv.ListenAndServe())
}
