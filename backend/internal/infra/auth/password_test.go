package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBcryptPasswordHasher_Hash(t *testing.T) {
	hasher := NewDefaultBcryptPasswordHasher()

	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "mysecretpassword123",
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  true,
		},
		{
			name:     "long password",
			password: "thisisaverylongpasswordthatexceedsnormallengths123456789",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := hasher.Hash(tt.password)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Empty(t, hash)
			} else {
				require.NoError(t, err)
				assert.NotEmpty(t, hash)
				// Hash should be different each time
				hash2, _ := hasher.Hash(tt.password)
				assert.NotEqual(t, hash, hash2)
			}
		})
	}
}

func TestBcryptPasswordHasher_Verify(t *testing.T) {
	hasher := NewDefaultBcryptPasswordHasher()

	tests := []struct {
		name     string
		password string
		hash     string
		want     bool
	}{
		{
			name:     "valid password",
			password: "mysecretpassword123",
			want:     true,
		},
		{
			name:     "wrong password",
			password: "wrongpassword",
			want:     false,
		},
		{
			name:     "empty password",
			password: "",
			want:     false,
		},
		{
			name:     "empty hash",
			password: "password123",
			hash:     "",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var hash string
			if tt.hash == "" && tt.want {
				// Generate hash for valid case
				var err error
				hash, err = hasher.Hash(tt.password)
				require.NoError(t, err)
			} else {
				hash = tt.hash
			}

			got := hasher.Verify(tt.password, hash)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBcryptPasswordHasher_HashAndVerify(t *testing.T) {
	hasher := NewDefaultBcryptPasswordHasher()
	password := "testpassword123"

	// Hash password
	hash, err := hasher.Hash(password)
	require.NoError(t, err)
	require.NotEmpty(t, hash)

	// Verify correct password
	assert.True(t, hasher.Verify(password, hash))

	// Verify wrong password
	assert.False(t, hasher.Verify("wrongpassword", hash))
}
