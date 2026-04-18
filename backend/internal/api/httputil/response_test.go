package httputil

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestWriteJSON(t *testing.T) {
	tests := []struct {
		name   string
		status int
		data   any
	}{
		{
			name:   "success response",
			status: http.StatusOK,
			data:   map[string]string{"message": "success"},
		},
		{
			name:   "created response",
			status: http.StatusCreated,
			data:   map[string]int{"id": 123},
		},
		{
			name:   "complex data",
			status: http.StatusOK,
			data: map[string]any{
				"user": map[string]string{
					"name": "John",
				},
				"items": []int{1, 2, 3},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()

			WriteJSON(rr, tt.status, tt.data)

			assert.Equal(t, tt.status, rr.Code)
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

			// Verify body can be decoded
			var result map[string]any
			err := json.Unmarshal(rr.Body.Bytes(), &result)
			assert.NoError(t, err)
			assert.NotNil(t, result)
		})
	}
}

func TestWriteProblem(t *testing.T) {
	tests := []struct {
		name   string
		status int
		title  string
		detail string
	}{
		{
			name:   "bad request",
			status: http.StatusBadRequest,
			title:  "Bad Request",
			detail: "Invalid input data",
		},
		{
			name:   "not found",
			status: http.StatusNotFound,
			title:  "Not Found",
			detail: "Resource not found",
		},
		{
			name:   "internal error",
			status: http.StatusInternalServerError,
			title:  "Internal Server Error",
			detail: "Something went wrong",
		},
		{
			name:   "validation error",
			status: http.StatusUnprocessableEntity,
			title:  "Validation Error",
			detail: "Field 'email' is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()

			WriteProblem(rr, tt.status, tt.title, tt.detail)

			assert.Equal(t, tt.status, rr.Code)
			assert.Equal(t, "application/problem+json", rr.Header().Get("Content-Type"))

			// Verify body structure
			var problem ProblemDetail
			err := json.Unmarshal(rr.Body.Bytes(), &problem)
			assert.NoError(t, err)
			assert.Equal(t, "about:blank", problem.Type)
			assert.Equal(t, tt.title, problem.Title)
			assert.Equal(t, tt.status, problem.Status)
			assert.Equal(t, tt.detail, problem.Detail)
		})
	}
}

func TestWriteProblem_EmptyDetail(t *testing.T) {
	rr := httptest.NewRecorder()

	WriteProblem(rr, http.StatusBadRequest, "Bad Request", "")

	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var problem ProblemDetail
	err := json.Unmarshal(rr.Body.Bytes(), &problem)
	assert.NoError(t, err)
	assert.Equal(t, "Bad Request", problem.Title)
	assert.Equal(t, "", problem.Detail)
}

func TestProblemDetail_Marshaling(t *testing.T) {
	problem := ProblemDetail{
		Type:   "about:blank",
		Title:  "Test Error",
		Status: 400,
		Detail: "Test detail",
	}

	data, err := json.Marshal(problem)
	assert.NoError(t, err)

	var decoded ProblemDetail
	err = json.Unmarshal(data, &decoded)
	assert.NoError(t, err)
	assert.Equal(t, problem, decoded)
}
