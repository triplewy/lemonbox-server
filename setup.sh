#!/bin/bash
sudo apt-get update
sudo apt-get install wget
yes | sudo apt-get install nodejs
yes | sudo apt-get install npm
yes | sudo apt-get install ruby
yes | sudo apt install git

cd /home/ubuntu

git clone https://github.com/triplewy/lemonbox-server.git && cd /home/ubuntu/lemonbox-server/ec2 && npm i

cd /home/ubuntu

sudo su root
echo '[Unit]
Description=Lemonbox server
After=network.target

[Service]
Environment=MYSQL_HOST=lemonbox-test.cq0pll4fgnmd.rds.cn-north-1.amazonaws.com.cn
Environment=MYSQL_USER=lemonbox
Environment=MYSQL_PASSWORD=Ta6N4Bry29KEb9a
Environment=MYSQL_DATABASE=lemonbox
Environment=NODE_ENV=production
Environment=NODE_PORT=8081
Type=simple
User=ubuntu
ExecStart=/usr/bin/node /home/ubuntu/lemonbox-server/ec2/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target' > /etc/systemd/system/lemonbox.service

sudo su ubuntu

sudo systemctl daemon-reload
sudo systemctl enable lemonbox
sudo systemctl start lemonbox
sudo systemctl status lemonbox

cd /home/ubuntu

wget https://aws-codedeploy-cn-north-1.s3.cn-north-1.amazonaws.com.cn/latest/install
chmod +x ./install
sudo ./install auto
sudo service codedeploy-agent restart
