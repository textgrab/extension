resource "aws_vpc" "main-vpc" {
    cidr_block = "10.0.0.0/16"
    enable_dns_support = "true"
    enable_dns_hostnames = "true"
    enable_classiclink = "false"
    instance_tenancy = "default"    
    
    tags = {
        Name = "textgrab-main-vpc"
    }
}

resource "aws_subnet" "subnet-public-1" {
    vpc_id = aws_vpc.main-vpc.id
    cidr_block = "10.0.0.0/24"
    map_public_ip_on_launch = "true"
    availability_zone = "us-east-1a"
    tags = {
        Name = "subnet-public-1"
    }
}
resource "aws_subnet" "subnet-public-2" {
    vpc_id = aws_vpc.main-vpc.id
    cidr_block = "10.0.1.0/24"
    map_public_ip_on_launch = "true"
    availability_zone = "us-east-1b"
    tags = {
        Name = "subnet-public-2"
    }
}
resource "aws_subnet" "subnet-private-1" {
    vpc_id = aws_vpc.main-vpc.id
    cidr_block = "10.0.2.0/24"
    map_public_ip_on_launch = "false"
    availability_zone = "us-east-1a"
    tags = {
        Name = "subnet-private-1"
    }
}
resource "aws_subnet" "subnet-private-2" {
    vpc_id = aws_vpc.main-vpc.id
    cidr_block = "10.0.3.0/24"
    map_public_ip_on_launch = "false"
    availability_zone = "us-east-1b"
    tags = {
        Name = "subnet-private-2"
    }
}

resource "aws_internet_gateway" "main-igw" {
    vpc_id = aws_vpc.main-vpc.id
    tags = {
        Name = "main-igw"
    }
}

// public route table
resource "aws_route_table" "main-public-crt" {
    vpc_id = aws_vpc.main-vpc.id
    
    route {
        cidr_block = "0.0.0.0/0" 
        gateway_id = aws_internet_gateway.main-igw.id
    }
    
    tags = {
        Name = "main-public-crt"
    }
}

resource "aws_route_table_association" "crta-public-subnet-1"{
    subnet_id = aws_subnet.subnet-public-1.id
    route_table_id = aws_route_table.main-public-crt.id
}

resource "aws_route_table_association" "crta-public-subnet-2"{
    subnet_id = aws_subnet.subnet-public-2.id
    route_table_id = aws_route_table.main-public-crt.id
}
