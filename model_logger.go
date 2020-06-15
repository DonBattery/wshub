package wshub

type BasicLogger interface {
	Debug(msg interface{})
	Debugf(format string, a ...interface{})

	Info(msg interface{})
	Infof(format string, a ...interface{})

	Warn(msg interface{})
	Warnf(format string, a ...interface{})

	Error(msg interface{})
	Errorf(format string, a ...interface{})

	Fatal(msg interface{})
	Fatalf(format string, a ...interface{})
}
