package user

import (
	"strings"
)

func emailDomain(email string) string {
	parts := strings.Split(strings.TrimSpace(email), "@")
	if len(parts) != 2 {
		return ""
	}
	return strings.ToLower(parts[1])
}
