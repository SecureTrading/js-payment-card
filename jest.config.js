module.exports = {"testEnvironment": "node",
		  "moduleNameMapper": {
		      "\\.(css|less|png)$": "<rootDir>/test/__mocks__/fileMock.js",
		      "\\.(html)$": "<rootDir>/test/__mocks__/htmlMock.js"
		  },
		  "transform": {
		      "^.+\\.js$": "babel-jest"
		  }
		  
		 }
