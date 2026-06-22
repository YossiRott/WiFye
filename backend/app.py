import os

from wifye import create_app
from wifye.config import DevConfig, ProdConfig

app = create_app(DevConfig if os.environ.get('FLASK_DEBUG') == '1' else ProdConfig)

if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'], port=8080, host='0.0.0.0')
