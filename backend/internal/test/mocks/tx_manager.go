package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
)

type TxManager struct {
	mock.Mock
}

func (m *TxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	args := m.Called(ctx, fn)
	return args.Error(0)
}
