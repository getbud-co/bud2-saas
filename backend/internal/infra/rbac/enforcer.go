package rbac

import (
	"log/slog"

	"github.com/casbin/casbin/v2"
)

var e *casbin.Enforcer

func InitEnforcer(modelPath, policyPath string) error {
	var err error
	e, err = casbin.NewEnforcer(modelPath, policyPath)
	if err != nil {
		slog.Error("failed to initialize casbin enforcer", "error", err)
		return err
	}
	slog.Info("casbin enforcer initialized", "model", modelPath, "policy", policyPath)
	return nil
}

func Enforcer() *casbin.Enforcer {
	return e
}
