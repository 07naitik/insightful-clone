"""
Network utilities for detecting client IP and MAC addresses
"""

import re
import socket
import subprocess
from typing import Optional
from fastapi import Request


def get_client_ip(request: Request) -> Optional[str]:
    """
    Extract client IP address from request headers and connection info
    Handles proxies, load balancers, and direct connections
    """
    # Check common proxy headers first
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, get the first one (client)
        ip = forwarded_for.split(",")[0].strip()
        if _is_valid_ip(ip):
            return ip
    
    # Check other common headers
    proxy_headers = [
        "X-Real-IP",
        "X-Forwarded",
        "X-Cluster-Client-IP",
        "CF-Connecting-IP"  # Cloudflare
    ]
    
    for header in proxy_headers:
        ip = request.headers.get(header)
        if ip and _is_valid_ip(ip.strip()):
            return ip.strip()
    
    # Fall back to direct client IP
    if hasattr(request, 'client') and request.client:
        return request.client.host
    
    return None


def get_server_mac_address() -> Optional[str]:
    """
    Get MAC address of the server's primary network interface using system tools
    Docker-compatible alternative to psutil
    """
    try:
        # Try to get MAC from /sys/class/net (Linux)
        import os
        import glob
        
        net_interfaces = glob.glob('/sys/class/net/*')
        for interface_path in net_interfaces:
            interface_name = os.path.basename(interface_path)
            
            # Skip loopback and virtual interfaces
            if interface_name.startswith(('lo', 'docker', 'br-', 'veth')):
                continue
                
            mac_file = os.path.join(interface_path, 'address')
            if os.path.exists(mac_file):
                with open(mac_file, 'r') as f:
                    mac = f.read().strip()
                    if mac and mac != "00:00:00:00:00:00":
                        return _format_mac_address(mac)
        
        return None
    except Exception:
        return None


def get_mac_from_ip(ip_address: str) -> Optional[str]:
    """
    Attempt to get MAC address from IP using ARP table
    Only works for local network clients
    """
    if not ip_address or not _is_valid_ip(ip_address):
        return None
    
    try:
        # Try ARP lookup (Linux/Unix)
        result = subprocess.run(['arp', '-n', ip_address], 
                              capture_output=True, text=True, timeout=2)
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if ip_address in line:
                    parts = line.split()
                    for part in parts:
                        if _is_valid_mac(part):
                            return _format_mac_address(part)
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
        pass
    
    return None


def _is_valid_ip(ip: str) -> bool:
    """Validate IP address format"""
    if not ip:
        return False
    
    # Check for private/local IPs that we shouldn't log
    private_ranges = ['127.', '0.0.0.0', '::1']
    if any(ip.startswith(range_) for range_ in private_ranges):
        return False
    
    try:
        socket.inet_aton(ip)
        return True
    except socket.error:
        return False


def _is_valid_mac(mac: str) -> bool:
    """Validate MAC address format"""
    if not mac:
        return False
    
    # MAC address pattern: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
    mac_pattern = r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
    return bool(re.match(mac_pattern, mac))


def _format_mac_address(mac: str) -> str:
    """Normalize MAC address to standard format (XX:XX:XX:XX:XX:XX)"""
    if not mac:
        return ""
    
    # Remove any separators and convert to uppercase
    clean_mac = re.sub(r'[:-]', '', mac.upper())
    
    # Add colons between each pair of characters
    if len(clean_mac) == 12:
        return ':'.join(clean_mac[i:i+2] for i in range(0, 12, 2))
    
    return mac  # Return original if format is unexpected


def detect_client_network_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Comprehensive network detection for client IP and MAC address
    Returns (ip_address, mac_address) tuple
    """
    # Get client IP
    client_ip = get_client_ip(request)
    
    # Try to get MAC address from IP (only works for local network)
    mac_address = None
    if client_ip:
        mac_address = get_mac_from_ip(client_ip)
    
    # If we can't get client MAC, get server MAC as fallback for tracking
    if not mac_address:
        mac_address = get_server_mac_address()
    
    return client_ip, mac_address
